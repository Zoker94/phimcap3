import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Search, Download, Loader2, ExternalLink, Check, X, Globe } from 'lucide-react';
import { firecrawlApi, extractVideoUrls, extractThumbnail, extractTitle, extractDescription } from '@/lib/api/firecrawl';
import { supabase } from '@/integrations/supabase/client';

interface ScrapedVideo {
  id: string;
  url: string;
  type: 'iframe' | 'direct';
  title: string | null;
  thumbnail: string | null;
  description: string | null;
  sourceUrl: string;
  selected: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface AdminAutoLeechProps {
  categories: Category[];
  onVideosAdded: () => void;
}

export function AdminAutoLeech({ categories, onVideosAdded }: AdminAutoLeechProps) {
  const [targetUrl, setTargetUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapedVideos, setScrapedVideos] = useState<ScrapedVideo[]>([]);
  const [importing, setImporting] = useState(false);
  
  // Import settings
  const [categoryId, setCategoryId] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [isVietsub, setIsVietsub] = useState(false);
  const [isUncensored, setIsUncensored] = useState(false);

  const handleScrape = async () => {
    if (!targetUrl.trim()) {
      toast.error('Vui lòng nhập URL trang web');
      return;
    }

    setScraping(true);
    setScrapedVideos([]);

    try {
      const response = await firecrawlApi.scrape(targetUrl, {
        formats: ['html', 'links'],
        onlyMainContent: false,
        waitFor: 5000,
      });

      if (!response.success) {
        toast.error(response.error || 'Lỗi scrape trang web');
        setScraping(false);
        return;
      }

      const html = response.data?.html || response.html || '';
      const { iframeUrls, directUrls } = extractVideoUrls(html);
      const pageTitle = extractTitle(html);
      const pageThumbnail = extractThumbnail(html);
      const pageDescription = extractDescription(html);

      const videos: ScrapedVideo[] = [];

      // Add iframe videos
      iframeUrls.forEach((url, index) => {
        videos.push({
          id: `iframe-${index}`,
          url,
          type: 'iframe',
          title: pageTitle || `Video ${index + 1}`,
          thumbnail: pageThumbnail,
          description: pageDescription,
          sourceUrl: targetUrl,
          selected: true,
        });
      });

      // Add direct videos
      directUrls.forEach((url, index) => {
        videos.push({
          id: `direct-${index}`,
          url,
          type: 'direct',
          title: pageTitle || `Video ${index + 1}`,
          thumbnail: pageThumbnail,
          description: pageDescription,
          sourceUrl: targetUrl,
          selected: true,
        });
      });

      if (videos.length === 0) {
        toast.warning('Không tìm thấy video nào trên trang này');
      } else {
        toast.success(`Tìm thấy ${videos.length} video`);
      }

      setScrapedVideos(videos);
    } catch (error) {
      console.error('Scrape error:', error);
      toast.error('Lỗi kết nối đến Firecrawl');
    } finally {
      setScraping(false);
    }
  };

  const toggleVideoSelection = (id: string) => {
    setScrapedVideos(videos =>
      videos.map(v => (v.id === id ? { ...v, selected: !v.selected } : v))
    );
  };

  const selectAll = () => {
    setScrapedVideos(videos => videos.map(v => ({ ...v, selected: true })));
  };

  const deselectAll = () => {
    setScrapedVideos(videos => videos.map(v => ({ ...v, selected: false })));
  };

  const updateVideoTitle = (id: string, title: string) => {
    setScrapedVideos(videos =>
      videos.map(v => (v.id === id ? { ...v, title } : v))
    );
  };

  const handleImport = async () => {
    const selectedVideos = scrapedVideos.filter(v => v.selected);
    if (selectedVideos.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 video để import');
      return;
    }

    setImporting(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const video of selectedVideos) {
        const { error } = await supabase.from('videos').insert({
          title: video.title || 'Untitled Video',
          description: video.description,
          thumbnail_url: video.thumbnail,
          video_url: video.url,
          video_type: video.type === 'iframe' ? 'iframe' : 'upload',
          category_id: categoryId || null,
          is_vip: isVip,
          is_vietsub: isVietsub,
          is_uncensored: isUncensored,
          status: 'approved',
          visibility: 'public',
        });

        if (error) {
          console.error('Import error:', error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Đã import ${successCount} video thành công`);
        onVideosAdded();
        // Remove imported videos from list
        setScrapedVideos(videos => videos.filter(v => !v.selected));
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} video import thất bại`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Lỗi import video');
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = scrapedVideos.filter(v => v.selected).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Auto Leech Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label className="text-xs">URL trang web chứa video</Label>
            <div className="flex gap-2">
              <Input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com/video/123"
                className="h-8 text-sm flex-1"
              />
              <Button
                size="sm"
                className="h-8"
                onClick={handleScrape}
                disabled={scraping}
              >
                {scraping ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <Search className="h-3 w-3 mr-1" />
                    Quét video
                  </>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Nhập URL trang web chứa video, hệ thống sẽ tự động tìm và trích xuất video
            </p>
          </div>

          {/* Import Settings */}
          {scrapedVideos.length > 0 && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <Label className="text-xs font-medium">Cài đặt import</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Danh mục</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-7 text-xs">
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
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch id="leech-vip" checked={isVip} onCheckedChange={setIsVip} />
                  <Label htmlFor="leech-vip" className="text-xs">VIP</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="leech-vietsub" checked={isVietsub} onCheckedChange={setIsVietsub} />
                  <Label htmlFor="leech-vietsub" className="text-xs">Vietsub</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="leech-uncensored" checked={isUncensored} onCheckedChange={setIsUncensored} />
                  <Label htmlFor="leech-uncensored" className="text-xs">Không che</Label>
                </div>
              </div>
            </div>
          )}

          {/* Scraped Videos List */}
          {scrapedVideos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium">
                    Tìm thấy {scrapedVideos.length} video
                  </Label>
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      Đã chọn {selectedCount}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={selectAll}>
                    <Check className="h-2.5 w-2.5 mr-1" />
                    Chọn tất cả
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={deselectAll}>
                    <X className="h-2.5 w-2.5 mr-1" />
                    Bỏ chọn
                  </Button>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {scrapedVideos.map((video) => (
                  <Card key={video.id} className={`overflow-hidden ${!video.selected ? 'opacity-50' : ''}`}>
                    <CardContent className="p-2">
                      <div className="flex gap-2 items-start">
                        <Checkbox
                          checked={video.selected}
                          onCheckedChange={() => toggleVideoSelection(video.id)}
                          className="mt-1"
                        />
                        <div className="w-16 h-10 rounded bg-muted shrink-0 overflow-hidden">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ExternalLink className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <Input
                            value={video.title || ''}
                            onChange={(e) => updateVideoTitle(video.id, e.target.value)}
                            className="h-6 text-[11px]"
                            placeholder="Tiêu đề video"
                          />
                          <div className="flex items-center gap-2">
                            <Badge variant={video.type === 'iframe' ? 'default' : 'secondary'} className="text-[9px]">
                              {video.type === 'iframe' ? 'Iframe' : 'Direct'}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground truncate flex-1" title={video.url}>
                              {video.url.substring(0, 50)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Import Button */}
              <Button
                className="w-full h-8 text-sm"
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Đang import...
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    Import {selectedCount} video
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
