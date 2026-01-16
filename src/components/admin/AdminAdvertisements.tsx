import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Advertisement {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string;
  position: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export function AdminAdvertisements() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [position, setPosition] = useState('sidebar');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: advertisements, isLoading } = useQuery({
    queryKey: ['admin-advertisements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Advertisement[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (ad: Omit<Advertisement, 'id' | 'created_at'>) => {
      const { error } = await supabase
        .from('advertisements')
        .insert(ad);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-advertisements'] });
      toast.success('Đã thêm quảng cáo mới');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Lỗi khi thêm quảng cáo: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...ad }: Partial<Advertisement> & { id: string }) => {
      const { error } = await supabase
        .from('advertisements')
        .update(ad)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-advertisements'] });
      toast.success('Đã cập nhật quảng cáo');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Lỗi khi cập nhật: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-advertisements'] });
      toast.success('Đã xóa quảng cáo');
    },
    onError: (error) => {
      toast.error('Lỗi khi xóa: ' + error.message);
    }
  });

  const resetForm = () => {
    setEditingAd(null);
    setTitle('');
    setLinkUrl('');
    setImageUrl('');
    setPosition('sidebar');
    setIsActive(true);
    setDisplayOrder(0);
  };

  const openEditDialog = (ad: Advertisement) => {
    setEditingAd(ad);
    setTitle(ad.title);
    setLinkUrl(ad.link_url);
    setImageUrl(ad.image_url || '');
    setPosition(ad.position);
    setIsActive(ad.is_active);
    setDisplayOrder(ad.display_order);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const adData = {
      title,
      link_url: linkUrl,
      image_url: imageUrl || null,
      position,
      is_active: isActive,
      display_order: displayOrder
    };

    if (editingAd) {
      updateMutation.mutate({ id: editingAd.id, ...adData });
    } else {
      createMutation.mutate(adData);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('advertisements')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('advertisements')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast.success('Đã tải lên banner');
    } catch (error: any) {
      toast.error('Lỗi tải lên: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getPositionLabel = (pos: string) => {
    const labels: Record<string, string> = {
      'sidebar': 'Thanh bên',
      'header': 'Đầu trang',
      'footer': 'Cuối trang',
      'video-page': 'Trang video',
      'popup': 'Popup'
    };
    return labels[pos] || pos;
  };

  if (isLoading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Quản lý quảng cáo</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Thêm quảng cáo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAd ? 'Sửa quảng cáo' : 'Thêm quảng cáo mới'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tên quảng cáo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkUrl">Link URL</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Banner (hình ảnh)</Label>
                <div className="flex gap-2">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="URL hình ảnh hoặc tải lên"
                    className="flex-1"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="mt-2 max-h-32 rounded-md object-contain"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Vị trí hiển thị</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sidebar">Thanh bên</SelectItem>
                    <SelectItem value="header">Đầu trang</SelectItem>
                    <SelectItem value="footer">Cuối trang</SelectItem>
                    <SelectItem value="video-page">Trang video</SelectItem>
                    <SelectItem value="popup">Popup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayOrder">Thứ tự hiển thị</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Kích hoạt</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAd ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {advertisements && advertisements.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banner</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thứ tự</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advertisements.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    {ad.image_url ? (
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        className="w-16 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ad.title}</span>
                      <a
                        href={ad.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>{getPositionLabel(ad.position)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      ad.is_active 
                        ? 'bg-green-500/20 text-green-500' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {ad.is_active ? 'Đang hiển thị' : 'Đã tắt'}
                    </span>
                  </TableCell>
                  <TableCell>{ad.display_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(ad)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa quảng cáo này?')) {
                            deleteMutation.mutate(ad.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Chưa có quảng cáo nào. Nhấn "Thêm quảng cáo" để bắt đầu.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
