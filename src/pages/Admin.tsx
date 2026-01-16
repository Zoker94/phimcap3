import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Video, Users, FolderOpen } from 'lucide-react';
import { AdminVideos } from '@/components/admin/AdminVideos';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminCategories } from '@/components/admin/AdminCategories';

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-sm text-muted-foreground mb-4">Bạn không có quyền truy cập trang này</p>
        <Button onClick={() => navigate('/')} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Về trang chủ
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold">Quản trị</h1>
          </div>
        </div>
      </header>

      <div className="p-4">
        <Tabs defaultValue="videos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="videos" className="text-xs gap-1">
              <Video className="h-3 w-3" />
              Video
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              Thành viên
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs gap-1">
              <FolderOpen className="h-3 w-3" />
              Danh mục
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <AdminVideos />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="categories">
            <AdminCategories />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}