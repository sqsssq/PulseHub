import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Clock, FileText, CheckCircle2, Link2, QrCode } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Discussion } from '../types';
import { QRCodeSVG } from 'qrcode.react';

// Mock data
const initialDiscussions: Discussion[] = [
  {
    id: '1',
    title: 'AI Applications in Modern Education',
    topic: 'Discuss how artificial intelligence is transforming traditional education models, including personalized learning and intelligent assessment systems',
    createdAt: '2026-03-28T10:00:00Z',
    status: 'completed',
    duration: 1800,
    joinCode: 'ABC123',
  },
  {
    id: '2',
    title: 'Sustainable Development Goals',
    topic: 'Explore practical ways to implement sustainable development principles in daily life and community initiatives',
    createdAt: '2026-03-27T14:30:00Z',
    status: 'active',
    duration: 900,
    startTime: Date.now() - 300000,
    joinCode: 'XYZ789',
  },
];

export function DiscussionList() {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdDiscussion, setCreatedDiscussion] = useState<Discussion | null>(null);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    topic: '',
  });

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateDiscussion = () => {
    if (!newDiscussion.title.trim() || !newDiscussion.topic.trim()) return;

    const joinCode = generateJoinCode();
    const discussion: Discussion = {
      id: Date.now().toString(),
      title: newDiscussion.title,
      topic: newDiscussion.topic,
      createdAt: new Date().toISOString(),
      status: 'draft',
      duration: 0,
      joinCode,
    };

    setDiscussions([discussion, ...discussions]);
    setCreatedDiscussion(discussion);
    setNewDiscussion({ title: '', topic: '' });
  };

  const handleCloseCreatedDialog = () => {
    setCreatedDiscussion(null);
    setIsCreateOpen(false);
  };

  const getJoinUrl = (code: string) => {
    return `${window.location.origin}/join/${code}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: Discussion['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-600';
      case 'paused':
        return 'bg-amber-600';
      case 'completed':
        return 'bg-slate-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getStatusText = (status: Discussion['status']) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      default:
        return 'Draft';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl mb-1 text-slate-900">Teacher Workspace</h1>
            <p className="text-slate-600">Create and manage student discussion sessions</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full md:w-auto bg-slate-900 hover:bg-slate-800">
                <Plus className="mr-2 h-5 w-5" />
                New Discussion
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              {!createdDiscussion ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Create New Discussion</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Discussion Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter discussion title..."
                        value={newDiscussion.title}
                        onChange={(e) =>
                          setNewDiscussion({ ...newDiscussion, title: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="topic">Discussion Topic</Label>
                      <Textarea
                        id="topic"
                        placeholder="Enter detailed discussion topic and requirements..."
                        rows={5}
                        value={newDiscussion.topic}
                        onChange={(e) =>
                          setNewDiscussion({ ...newDiscussion, topic: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateDiscussion} className="bg-slate-900 hover:bg-slate-800">
                        Create Discussion
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Discussion Created Successfully</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 pt-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-800 mb-2">
                        Share this code or link with your students to join the discussion
                      </p>
                    </div>

                    {/* Join Code */}
                    <div className="space-y-2">
                      <Label>Join Code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={createdDiscussion.joinCode}
                          readOnly
                          className="font-mono text-lg"
                        />
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(createdDiscussion.joinCode)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    {/* Join URL */}
                    <div className="space-y-2">
                      <Label>Join URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={getJoinUrl(createdDiscussion.joinCode)}
                          readOnly
                          className="text-sm"
                        />
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(getJoinUrl(createdDiscussion.joinCode))}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="space-y-2">
                      <Label>QR Code</Label>
                      <div className="flex justify-center p-6 bg-white border-2 border-slate-200 rounded-lg">
                        <QRCodeSVG
                          value={getJoinUrl(createdDiscussion.joinCode)}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="text-xs text-center text-slate-500">
                        Students can scan this QR code to join
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={handleCloseCreatedDialog}>
                        Close
                      </Button>
                      <Button
                        onClick={() => {
                          navigate(`/discussion/${createdDiscussion.id}`);
                          handleCloseCreatedDialog();
                        }}
                        className="bg-slate-900 hover:bg-slate-800"
                      >
                        Open Discussion
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Discussions</p>
                <p className="text-3xl text-slate-900">{discussions.length}</p>
              </div>
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </Card>
          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Active Now</p>
                <p className="text-3xl text-slate-900">
                  {discussions.filter((d) => d.status === 'active').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-emerald-500" />
            </div>
          </Card>
          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Completed</p>
                <p className="text-3xl text-slate-900">
                  {discussions.filter((d) => d.status === 'completed').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-slate-400" />
            </div>
          </Card>
        </div>

        {/* Discussions List */}
        <div>
          <h2 className="text-xl mb-4 text-slate-900">All Discussions</h2>
          <div className="grid grid-cols-1 gap-4">
            {discussions.map((discussion) => (
              <Card
                key={discussion.id}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer border-slate-200"
                onClick={() => navigate(`/discussion/${discussion.id}`)}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl text-slate-900">{discussion.title}</h3>
                      <Badge className={`${getStatusColor(discussion.status)} text-white`}>
                        {getStatusText(discussion.status)}
                      </Badge>
                    </div>
                    <p className="text-slate-600 mb-3 line-clamp-2">{discussion.topic}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(discussion.createdAt)}
                      </span>
                      {discussion.duration > 0 && (
                        <span className="flex items-center gap-1">
                          Duration: {formatDuration(discussion.duration)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono">
                        <QrCode className="h-4 w-4" />
                        {discussion.joinCode}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/discussion/${discussion.id}`);
                    }}
                    className="border-slate-300"
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
