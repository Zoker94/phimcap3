import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Tag, Video } from 'lucide-react';

interface TagItem {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  video_count?: number;
}

export function AdminTags() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTags = async () => {
    // Fetch tags with video count
    const { data: tagsData } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (tagsData) {
      // Get video count for each tag
      const tagsWithCount = await Promise.all(
        tagsData.map(async (tag) => {
          const { count } = await supabase
            .from('video_tags')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tag.id);
          return { ...tag, video_count: count || 0 };
        })
      );
      setTags(tagsWithCount);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const resetForm = () => {
    setName('');
    setEditingTag(null);
  };

  const openEditDialog = (tag: TagItem) => {
    setEditingTag(tag);
    setName(tag.name);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSubmitting(true);
    const slug = createSlug(name);

    if (editingTag) {
      const { error } = await supabase
        .from('tags')
        .update({ name: name.trim(), slug })
        .eq('id', editingTag.id);
      
      if (error) {
        toast.error('Lỗi cập nhật tag');
      } else {
        toast.success('Đã cập nhật tag');
        setDialogOpen(false);
        resetForm();
        fetchTags();
      }
    } else {
      // Check if tag already exists
      const { data: existing } = await supabase
        .from('tags')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      
      if (existing) {
        toast.error('Tag đã tồn tại');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('tags')
        .insert({ name: name.trim(), slug });
      
      if (error) {
        toast.error('Lỗi thêm tag');
      } else {
        toast.success('Đã thêm tag');
        setDialogOpen(false);
        resetForm();
        fetchTags();
      }
    }
    setSubmitting(false);
  };

  const deleteTag = async (id: string) => {
    if (!confirm('Xác nhận xóa tag này? Các video sẽ không còn liên kết với tag này.')) return;
    
    // First delete video_tags associations
    await supabase.from('video_tags').delete().eq('tag_id', id);
    
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) {
      toast.error('Lỗi xóa tag');
    } else {
      toast.success('Đã xóa tag');
      fetchTags();
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Tìm kiếm tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm max-w-xs"
        />
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs shrink-0">
              <Plus className="h-3 w-3 mr-1" />
              Thêm tag
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editingTag ? 'Sửa tag' : 'Thêm tag mới'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Tên tag *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="VD: Việt Nam, Hot girl, ..."
                  className="h-8 text-sm"
                />
                {name && (
                  <p className="text-[10px] text-muted-foreground">
                    Slug: {createSlug(name)}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full h-8 text-sm" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : (editingTag ? 'Cập nhật' : 'Thêm tag')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredTags.length} tags
      </p>

      <div className="flex flex-wrap gap-2">
        {filteredTags.map((tag) => (
          <Card key={tag.id} className="inline-block">
            <CardContent className="p-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag.name}
              </Badge>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Video className="h-3 w-3" />
                {tag.video_count}
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0" 
                  onClick={() => openEditDialog(tag)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 text-destructive" 
                  onClick={() => deleteTag(tag.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTags.length === 0 && (
        <div className="text-center py-8">
          <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'Không tìm thấy tag nào' : 'Chưa có tag nào. Thêm tag mới hoặc gán tag khi thêm video.'}
          </p>
        </div>
      )}
    </div>
  );
}
