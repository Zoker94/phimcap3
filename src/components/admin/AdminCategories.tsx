import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, FolderOpen } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setName('');
    setSlug('');
    setEditingCategory(null);
  };

  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDialogOpen(true);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingCategory) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const categoryData = { name, slug };

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', editingCategory.id);
      
      if (error) {
        toast.error('Lỗi cập nhật danh mục');
      } else {
        toast.success('Đã cập nhật danh mục');
        setDialogOpen(false);
        resetForm();
        fetchCategories();
      }
    } else {
      const { error } = await supabase.from('categories').insert(categoryData);
      
      if (error) {
        toast.error('Lỗi thêm danh mục');
      } else {
        toast.success('Đã thêm danh mục');
        setDialogOpen(false);
        resetForm();
        fetchCategories();
      }
    }
    setSubmitting(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Xác nhận xóa danh mục này?')) return;
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast.error('Lỗi xóa danh mục');
    } else {
      toast.success('Đã xóa danh mục');
      fetchCategories();
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} danh mục</p>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Thêm danh mục
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Tên danh mục *</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Slug *</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <Button type="submit" className="w-full h-8 text-sm" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : (editingCategory ? 'Cập nhật' : 'Thêm')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">{cat.name}</p>
                    <p className="text-[10px] text-muted-foreground">/{cat.slug}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(cat)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCategory(cat.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}