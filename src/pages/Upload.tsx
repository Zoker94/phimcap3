import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { Upload as UploadIcon, Video, Image, ArrowLeft, CheckCircle, Clock, XCircle, Globe, Lock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface Category {
  id: string;
  name: string;
}

interface UserVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  status: string;
  visibility: string;
  created_at: string;
  views: number;
}

export default function Upload() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadEnabled, setUploadEnabled] = useState<boolean | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<string>("public");

  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Bạn cần đăng nhập để upload video",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    checkUploadEnabled();
    fetchCategories();
    if (user) {
      fetchUserVideos();
    }
  }, [user]);

  const checkUploadEnabled = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "upload_enabled")
      .single();
    
    // Default to true if setting doesn't exist
    setUploadEnabled(data?.value === "true" || data === null);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    if (data) setCategories(data);
  };

  const fetchUserVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("id, title, thumbnail_url, status, visibility, created_at, views")
      .eq("uploaded_by", user?.id)
      .order("created_at", { ascending: false });
    if (data) setUserVideos(data as UserVideo[]);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Định dạng không hợp lệ",
          description: "Chỉ chấp nhận file MP4, WebM hoặc MOV",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (500MB max)
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: "File quá lớn",
          description: "Dung lượng tối đa là 500MB",
          variant: "destructive",
        });
        return;
      }
      
      setVideoFile(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Định dạng không hợp lệ",
          description: "Chỉ chấp nhận file JPG, PNG hoặc WebP",
          variant: "destructive",
        });
        return;
      }
      
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile || !title.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền tiêu đề và chọn file video",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Phiên đăng nhập hết hạn",
          description: "Vui lòng đăng nhập lại",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("title", title.trim());
      if (description) formData.append("description", description.trim());
      if (categoryId) formData.append("category_id", categoryId);
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
      formData.append("visibility", visibility);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-video`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      clearInterval(progressInterval);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadProgress(100);
      
      toast({
        title: "Upload thành công!",
        description: "Video của bạn đang chờ admin duyệt",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCategoryId("");
      setVideoFile(null);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setVisibility("public");
      
      // Refresh user videos
      fetchUserVideos();
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload thất bại",
        description: error.message || "Đã có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Đã duyệt";
      case "pending":
        return "Chờ duyệt";
      case "rejected":
        return "Từ chối";
      default:
        return status;
    }
  };

  const getVisibilityIcon = (vis: string) => {
    return vis === 'private' 
      ? <Lock className="h-3 w-3 text-muted-foreground" /> 
      : <Globe className="h-3 w-3 text-muted-foreground" />;
  };

  if (loading || uploadEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!uploadEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Upload Video</h1>
          </div>
          
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Chức năng đang tạm đóng</h2>
              <p className="text-muted-foreground">
                Tính năng upload video hiện đang bị tắt. Vui lòng quay lại sau.
              </p>
              <Link to="/">
                <Button className="mt-6">Về trang chủ</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Upload Video</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5" />
                Tải lên video mới
              </CardTitle>
              <CardDescription>
                Video sẽ được admin xét duyệt trước khi hiển thị công khai
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Tiêu đề *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề video"
                    disabled={uploading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả về video (tùy chọn)"
                    disabled={uploading}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Danh mục</Label>
                  <Select value={categoryId} onValueChange={setCategoryId} disabled={uploading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video">File video * (MP4, WebM, MOV - tối đa 500MB)</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                    <input
                      id="video"
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleVideoChange}
                      disabled={uploading}
                      className="hidden"
                    />
                    <label htmlFor="video" className="cursor-pointer">
                      <Video className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      {videoFile ? (
                        <p className="text-sm text-foreground">{videoFile.name}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Click để chọn file video</p>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Ảnh thumbnail (JPG, PNG, WebP)</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                    <input
                      id="thumbnail"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleThumbnailChange}
                      disabled={uploading}
                      className="hidden"
                    />
                    <label htmlFor="thumbnail" className="cursor-pointer">
                      {thumbnailPreview ? (
                        <img 
                          src={thumbnailPreview} 
                          alt="Thumbnail preview" 
                          className="max-h-32 mx-auto rounded"
                        />
                      ) : (
                        <>
                          <Image className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click để chọn ảnh thumbnail</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Visibility Selection */}
                <div className="space-y-3">
                  <Label>Chế độ hiển thị</Label>
                  <RadioGroup value={visibility} onValueChange={setVisibility} disabled={uploading}>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Globe className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="font-medium text-sm">Công khai</p>
                          <p className="text-xs text-muted-foreground">Mọi người đều có thể xem sau khi được duyệt</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Lock className="h-4 w-4 text-yellow-500" />
                        <div>
                          <p className="font-medium text-sm">Riêng tư</p>
                          <p className="text-xs text-muted-foreground">Chỉ bạn mới có thể xem video này</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-center text-muted-foreground">
                      Đang tải lên... {uploadProgress}%
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={uploading || !videoFile || !title.trim()}>
                  {uploading ? "Đang tải lên..." : "Upload Video"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* User's Videos */}
          <Card>
            <CardHeader>
              <CardTitle>Video của bạn</CardTitle>
              <CardDescription>
                Danh sách video bạn đã upload
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userVideos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Bạn chưa upload video nào
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {userVideos.map((video) => (
                    <div 
                      key={video.id} 
                      className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        {video.thumbnail_url ? (
                          <img 
                            src={video.thumbnail_url} 
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{video.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {getStatusIcon(video.status)}
                          <span className="text-xs text-muted-foreground">
                            {getStatusText(video.status)}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getVisibilityIcon(video.visibility)}
                            {video.visibility === 'private' ? 'Riêng tư' : 'Công khai'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {video.views} lượt xem • {new Date(video.created_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
