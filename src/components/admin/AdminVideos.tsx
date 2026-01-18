import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ExternalLink, X, Tag, CheckCircle, XCircle, Clock, Filter, Eye, EyeOff } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string;
  video_type: string;
  category_id: string | null;
  is_vip: boolean;
  is_vietsub: boolean;
  is_uncensored: boolean;
  views: number;
  duration: string | null;
  status?: string;
  uploaded_by?: string;
  visibility?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

export function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState('bunny');
  const [categoryId, setCategoryId] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [isVietsub, setIsVietsub] = useState(false);
  const [isUncensored, setIsUncensored] = useState(false);
  const [duration, setDuration] = useState('');
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    const [videosRes, catsRes, tagsRes] = await Promise.all([
      supabase.from('videos').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*'),
      supabase.from('tags').select('*').order('name')
    ]);
    
    if (videosRes.data) setVideos(videosRes.data);
    if (catsRes.data) setCategories(catsRes.data);
    if (tagsRes.data) setAllTags(tagsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setThumbnailUrl('');
    setVideoUrl('');
    setVideoType('bunny');
    setCategoryId('');
    setIsVip(false);
    setIsVietsub(false);
    setIsUncensored(false);
    setDuration('');
    setSelectedTags([]);
    setTagInput('');
    setEditingVideo(null);
  };

  const fetchVideoTags = async (videoId: string) => {
    const { data } = await supabase
      .from('video_tags')
      .select('tag_id, tags(id, name, slug)')
      .eq('video_id', videoId);
    
    if (data) {
      const tags = data.map((vt: any) => vt.tags).filter(Boolean);
      setSelectedTags(tags);
    }
  };

  const openEditDialog = async (video: Video) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description || '');
    setThumbnailUrl(video.thumbnail_url || '');
    setVideoUrl(video.video_url);
    setVideoType(video.video_type || 'bunny');
    setCategoryId(video.category_id || '');
    setIsVip(video.is_vip || false);
    setIsVietsub(video.is_vietsub || false);
    setIsUncensored(video.is_uncensored || false);
    setDuration(video.duration || '');
    setDialogOpen(true);
    await fetchVideoTags(video.id);
  };

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

  const addTag = async () => {
    const tagName = tagInput.trim();
    if (!tagName) return;

    // Check if tag already selected
    if (selectedTags.find(t => t.name.toLowerCase() === tagName.toLowerCase())) {
      setTagInput('');
      return;
    }

    // Check if tag exists in database
    let existingTag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    
    if (!existingTag) {
      // Create new tag
      const slug = createSlug(tagName);
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: tagName, slug })
        .select()
        .single();
      
      if (error) {
        toast.error('Lỗi tạo tag');
        return;
      }
      existingTag = data;
      setAllTags([...allTags, data]);
    }

    setSelectedTags([...selectedTags, existingTag]);
    setTagInput('');
  };

  const removeTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };

  const selectExistingTag = (tag: TagItem) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setTagInput('');
  };

  const filteredTags = allTags.filter(t => 
    t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
    !selectedTags.find(st => st.id === t.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const videoData = {
      title,
      description: description || null,
      thumbnail_url: thumbnailUrl || null,
      video_url: videoUrl,
      video_type: videoType,
      category_id: categoryId || null,
      is_vip: isVip,
      is_vietsub: isVietsub,
      is_uncensored: isUncensored,
      duration: duration || null,
    };

    let videoId: string;

    if (editingVideo) {
      const { error } = await supabase
        .from('videos')
        .update(videoData)
        .eq('id', editingVideo.id);
      
      if (error) {
        toast.error('Lỗi cập nhật video');
        setSubmitting(false);
        return;
      }
      videoId = editingVideo.id;

      // Delete existing video_tags
      await supabase.from('video_tags').delete().eq('video_id', videoId);
    } else {
      const { data, error } = await supabase
        .from('videos')
        .insert(videoData)
        .select()
        .single();
      
      if (error || !data) {
        toast.error('Lỗi thêm video');
        setSubmitting(false);
        return;
      }
      videoId = data.id;
    }

    // Insert video_tags
    if (selectedTags.length > 0) {
      const videoTagsData = selectedTags.map(tag => ({
        video_id: videoId,
        tag_id: tag.id
      }));
      
      await supabase.from('video_tags').insert(videoTagsData);
    }

    toast.success(editingVideo ? 'Đã cập nhật video' : 'Đã thêm video');
    setDialogOpen(false);
    resetForm();
    fetchData();
    setSubmitting(false);
  };

  const deleteVideo = async (id: string) => {
    if (!confirm('Xác nhận xóa video này?')) return;
    
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) {
      toast.error('Lỗi xóa video');
    } else {
      toast.success('Đã xóa video');
      fetchData();
    }
  };

  const updateVideoStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('videos')
      .update({ status })
      .eq('id', id);
    
    if (error) {
      toast.error('Lỗi cập nhật trạng thái');
    } else {
      toast.success(status === 'approved' ? 'Đã duyệt video' : 'Đã từ chối video');
      fetchData();
    }
  };

  const toggleVideoVisibility = async (video: Video) => {
    const newVisibility = video.visibility === 'public' ? 'hidden' : 'public';
    console.log('Toggle visibility for video:', video.id, 'from', video.visibility, 'to', newVisibility);
    
    const { data, error } = await supabase
      .from('videos')
      .update({ visibility: newVisibility })
      .eq('id', video.id)
      .select();
    
    console.log('Update result:', { data, error });
    
    if (error) {
      console.error('Visibility update error:', error);
      toast.error('Lỗi cập nhật trạng thái hiển thị: ' + error.message);
    } else {
      toast.success(newVisibility === 'public' ? 'Đã hiển thị video' : 'Đã ẩn video');
      fetchData();
    }
  };

  const pendingCount = videos.filter(v => v.status === 'pending').length;
  
  const filteredVideos = statusFilter === 'all' 
    ? videos 
    : videos.filter(v => v.status === statusFilter);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="text-[10px] bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="h-2.5 w-2.5 mr-1" />Đã duyệt</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="h-2.5 w-2.5 mr-1" />Chờ duyệt</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-[10px] bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="h-2.5 w-2.5 mr-1" />Từ chối</Badge>;
      default:
        return <Badge variant="default" className="text-[10px]">Đã duyệt</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{filteredVideos.length} video</p>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-500">
              {pendingCount} chờ duyệt
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Chờ duyệt</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Thêm video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {editingVideo ? 'Sửa video' : 'Thêm video mới'}
                </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Tiêu đề *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mô tả</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">URL Thumbnail</Label>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Loại video *</Label>
                <Select value={videoType} onValueChange={setVideoType}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bunny">Bunny.net (Embed)</SelectItem>
                    <SelectItem value="upload">Direct URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">
                  {videoType === 'bunny' ? 'Bunny.net Embed URL *' : 'Video URL *'}
                </Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={videoType === 'bunny' ? 'https://iframe.mediadelivery.net/embed/...' : 'https://...'}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Danh mục</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Từ khóa (Tags SEO)
                </Label>
                
                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedTags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-[10px] h-5 gap-1">
                        {tag.name}
                        <button type="button" onClick={() => removeTag(tag.id)}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Tag Input */}
                <div className="relative">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Nhập từ khóa và Enter"
                    className="h-8 text-sm"
                  />
                  
                  {/* Suggestions */}
                  {tagInput && filteredTags.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-popover border rounded-md shadow-lg z-10 max-h-32 overflow-y-auto mt-1">
                      {filteredTags.slice(0, 5).map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => selectExistingTag(tag)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Nhập từ khóa liên quan để tối ưu SEO, phân cách bằng Enter
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Thời lượng</Label>
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="10:30"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Video VIP</Label>
                <Switch checked={isVip} onCheckedChange={setIsVip} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Vietsub</Label>
                <Switch checked={isVietsub} onCheckedChange={setIsVietsub} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Không che</Label>
                <Switch checked={isUncensored} onCheckedChange={setIsUncensored} />
              </div>
              <Button type="submit" className="w-full h-8 text-sm" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : (editingVideo ? 'Cập nhật' : 'Thêm video')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {filteredVideos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex gap-3">
                <div className="w-24 h-14 rounded bg-muted shrink-0 overflow-hidden">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium line-clamp-1">{video.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {getStatusBadge(video.status)}
                    {video.visibility === 'hidden' && (
                      <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                        <EyeOff className="h-2.5 w-2.5 mr-1" />Đã ẩn
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {video.views} views • {video.is_vip ? 'VIP' : 'Free'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 items-start">
                  {video.status === 'pending' && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10" 
                        onClick={() => updateVideoStatus(video.id, 'approved')}
                        title="Duyệt video"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                        onClick={() => updateVideoStatus(video.id, 'rejected')}
                        title="Từ chối video"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {video.status === 'approved' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-7 w-7 p-0 ${video.visibility === 'hidden' ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => toggleVideoVisibility(video)}
                      title={video.visibility === 'hidden' ? 'Hiển thị video' : 'Ẩn video'}
                    >
                      {video.visibility === 'hidden' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(video)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteVideo(video.id)}>
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