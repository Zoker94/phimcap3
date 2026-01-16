import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ThumbsUp, ThumbsDown, Trash2, Send, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  profile?: {
    username: string | null;
  };
}

interface UserReaction {
  comment_id: string;
  reaction_type: 'like' | 'dislike';
}

interface VideoCommentsProps {
  videoId: string;
}

export function VideoComments({ videoId }: VideoCommentsProps) {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [userReactions, setUserReactions] = useState<Map<string, string>>(new Map());
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    // Fetch comments first
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      setLoading(false);
      return;
    }

    if (commentsData && commentsData.length > 0) {
      // Get unique user IDs
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      
      // Fetch profiles for those users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      // Create a map of user_id to username
      const profilesMap = new Map<string, string>();
      profilesData?.forEach(p => {
        profilesMap.set(p.user_id, p.username || 'Người dùng');
      });

      // Combine comments with profiles
      setComments(commentsData.map(c => ({
        ...c,
        profile: { username: profilesMap.get(c.user_id) || 'Người dùng' }
      })));
    } else {
      setComments([]);
    }
    setLoading(false);
  };

  const fetchUserReactions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('comment_reactions')
      .select('comment_id, reaction_type')
      .eq('user_id', user.id);

    if (data) {
      const reactionsMap = new Map<string, string>();
      data.forEach((r: UserReaction) => {
        reactionsMap.set(r.comment_id, r.reaction_type);
      });
      setUserReactions(reactionsMap);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [videoId]);

  useEffect(() => {
    fetchUserReactions();
  }, [user]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      video_id: videoId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast.error('Không thể gửi bình luận');
    } else {
      setNewComment('');
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thực hiện');
      return;
    }

    const currentReaction = userReactions.get(commentId);

    if (currentReaction === type) {
      // Remove reaction
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
    } else if (currentReaction) {
      // Update reaction
      await supabase
        .from('comment_reactions')
        .update({ reaction_type: type })
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
    } else {
      // Insert new reaction
      await supabase.from('comment_reactions').insert({
        comment_id: commentId,
        user_id: user.id,
        reaction_type: type,
      });
    }

    fetchComments();
    fetchUserReactions();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Xóa bình luận này?')) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Không thể xóa bình luận');
    } else {
      fetchComments();
    }
  };

  return (
    <section className="border-t border-border pt-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
        <MessageCircle className="h-4 w-4" />
        Bình luận ({comments.length})
      </h3>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Viết bình luận..."
            rows={2}
            className="text-sm resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || submitting}
              className="h-8 text-xs"
            >
              <Send className="h-3 w-3 mr-1" />
              {submitting ? 'Đang gửi...' : 'Gửi'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground mb-4 bg-secondary p-3 rounded-lg">
          Đăng nhập để bình luận
        </p>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Chưa có bình luận nào
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const userReaction = userReactions.get(comment.id);
            const canDelete = user && (user.id === comment.user_id || isAdmin);

            return (
              <div key={comment.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-medium text-primary">
                    {(comment.profile?.username || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">
                      {comment.profile?.username || 'Người dùng'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed">{comment.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => handleReaction(comment.id, 'like')}
                      className={`flex items-center gap-1 text-[10px] transition-colors ${
                        userReaction === 'like'
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      {comment.likes_count > 0 && comment.likes_count}
                    </button>
                    <button
                      onClick={() => handleReaction(comment.id, 'dislike')}
                      className={`flex items-center gap-1 text-[10px] transition-colors ${
                        userReaction === 'dislike'
                          ? 'text-destructive'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ThumbsDown className="h-3 w-3" />
                      {comment.dislikes_count > 0 && comment.dislikes_count}
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}