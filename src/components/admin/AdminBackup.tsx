import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Database, Loader2, Github } from 'lucide-react';
import { toast } from 'sonner';

interface AdminBackupProps {
  isAdmin: boolean;
}

export function AdminBackup({ isAdmin }: AdminBackupProps) {
  const [loading, setLoading] = useState(false);

  const generateBackupSQL = async () => {
    setLoading(true);
    try {
      // Fetch all data from tables with no row limit (range 0-10000 to get all)
      const [
        videosRes,
        categoriesRes,
        tagsRes,
        videoTagsRes,
        profilesRes,
        userRolesRes,
        notificationsRes,
        advertisementsRes,
        siteSettingsRes,
        commentsRes,
        chatMessagesRes,
        commentReactionsRes
      ] = await Promise.all([
        supabase.from('videos').select('*').range(0, 9999),
        supabase.from('categories').select('*').range(0, 9999),
        supabase.from('tags').select('*').range(0, 9999),
        supabase.from('video_tags').select('*').range(0, 9999),
        supabase.from('profiles').select('*').range(0, 9999),
        supabase.from('user_roles').select('*').range(0, 9999),
        supabase.from('notifications').select('*').range(0, 9999),
        supabase.from('advertisements').select('*').range(0, 9999),
        supabase.from('site_settings').select('*').range(0, 9999),
        supabase.from('comments').select('*').range(0, 9999),
        supabase.from('chat_messages').select('*').range(0, 9999),
        supabase.from('comment_reactions').select('*').range(0, 9999)
      ]);

      const escapeSQL = (value: any): string => {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (typeof value === 'number') return String(value);
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return `'${String(value).replace(/'/g, "''")}'`;
      };

      const generateInserts = (tableName: string, data: any[] | null): string => {
        if (!data || data.length === 0) return `-- No data in ${tableName}\n`;
        
        const columns = Object.keys(data[0]);
        let sql = `-- ${tableName} (${data.length} records)\n`;
        
        for (const row of data) {
          const values = columns.map(col => escapeSQL(row[col])).join(', ');
          sql += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
        }
        
        return sql + '\n';
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      let backupSQL = `-- Database Backup
-- Generated at: ${new Date().toISOString()}
-- Project: PhimCap3

-- IMPORTANT: This backup contains data only, not schema.
-- Make sure the database schema is already set up before running this backup.

BEGIN;

-- Disable triggers temporarily for faster import
SET session_replication_role = replica;

`;

      // Order matters due to foreign keys
      backupSQL += generateInserts('categories', categoriesRes.data);
      backupSQL += generateInserts('tags', tagsRes.data);
      backupSQL += generateInserts('profiles', profilesRes.data);
      backupSQL += generateInserts('user_roles', userRolesRes.data);
      backupSQL += generateInserts('videos', videosRes.data);
      backupSQL += generateInserts('video_tags', videoTagsRes.data);
      backupSQL += generateInserts('comments', commentsRes.data);
      backupSQL += generateInserts('comment_reactions', commentReactionsRes.data);
      backupSQL += generateInserts('chat_messages', chatMessagesRes.data);
      backupSQL += generateInserts('notifications', notificationsRes.data);
      backupSQL += generateInserts('advertisements', advertisementsRes.data);
      backupSQL += generateInserts('site_settings', siteSettingsRes.data);

      backupSQL += `
-- Re-enable triggers
SET session_replication_role = DEFAULT;

COMMIT;

-- Backup completed successfully
`;

      // Create and download the file
      const blob = new Blob([backupSQL], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${timestamp}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Đã tạo file backup SQL');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Lỗi khi tạo backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SQL Backup Card - Only for Admin */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Backup Database (SQL)</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Tải xuống bản sao lưu dữ liệu dưới dạng file SQL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Dữ liệu sẽ được backup:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Videos, Categories, Tags</li>
                  <li>• User Profiles, Roles</li>
                  <li>• Comments, Chat Messages</li>
                  <li>• Notifications, Advertisements</li>
                  <li>• Site Settings</li>
                </ul>
              </div>
              
              <Button 
                onClick={generateBackupSQL} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo backup...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Tải xuống Backup SQL
                  </>
                )}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                File SQL sẽ được tải về máy của bạn. Lưu ý: Backup chỉ chứa dữ liệu, không chứa schema.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code Backup Card - Only for Admin */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Backup Mã Nguồn (Code)</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Tải xuống toàn bộ mã nguồn website dưới dạng ZIP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => window.open('https://github.com/Zoker94/phimcap3/archive/refs/heads/main.zip', '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Tải Backup Mã Nguồn (ZIP)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Message for managers */}
      {!isAdmin && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Bạn không có quyền tải backup. Chỉ Admin mới có thể sử dụng chức năng này.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
