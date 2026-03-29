import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Edit2,
  Check,
  X,
  Clock,
  Users,
  Lightbulb,
  ArrowUpDown,
  Share2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  QrCode,
  Link2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Discussion, Group, Idea } from '../types';
import { QRCodeSVG } from 'qrcode.react';

// Mock data
const mockDiscussion: Discussion = {
  id: '1',
  title: 'AI Applications in Modern Education',
  topic: 'Discuss how artificial intelligence is transforming traditional education models, including personalized learning and intelligent assessment systems',
  createdAt: '2026-03-28T10:00:00Z',
  status: 'draft',
  duration: 0,
  joinCode: 'ABC123',
};

const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Group A',
    discussionId: '1',
    color: 'bg-slate-700',
    selected: false,
    ideas: [
      {
        id: '1-1',
        content: 'AI can provide personalized learning paths, adjusting educational content based on each student\'s learning pace and comprehension level',
        groupId: '1',
        timestamp: '2026-03-28T10:05:00Z',
        selected: false,
      },
      {
        id: '1-2',
        content: 'Intelligent assessment systems can analyze student performance in real-time and provide immediate feedback',
        groupId: '1',
        timestamp: '2026-03-28T10:08:00Z',
        selected: false,
      },
    ],
  },
  {
    id: '2',
    name: 'Group B',
    discussionId: '1',
    color: 'bg-slate-600',
    selected: false,
    ideas: [
      {
        id: '2-1',
        content: 'AI teaching assistants can answer student questions 24/7, reducing the burden on teachers',
        groupId: '2',
        timestamp: '2026-03-28T10:06:00Z',
        selected: false,
      },
      {
        id: '2-2',
        content: 'Virtual reality combined with AI can create immersive learning experiences',
        groupId: '2',
        timestamp: '2026-03-28T10:10:00Z',
        selected: false,
      },
      {
        id: '2-3',
        content: 'Natural language processing can help students improve their writing skills',
        groupId: '2',
        timestamp: '2026-03-28T10:12:00Z',
        selected: false,
      },
    ],
  },
  {
    id: '3',
    name: 'Group C',
    discussionId: '1',
    color: 'bg-slate-500',
    selected: false,
    ideas: [
      {
        id: '3-1',
        content: 'AI can help identify student learning barriers and provide targeted intervention plans',
        groupId: '3',
        timestamp: '2026-03-28T10:07:00Z',
        selected: false,
      },
    ],
  },
  {
    id: '4',
    name: 'Group D',
    discussionId: '1',
    color: 'bg-slate-400',
    selected: false,
    ideas: [
      {
        id: '4-1',
        content: 'Gamified learning combined with AI can enhance student motivation and engagement',
        groupId: '4',
        timestamp: '2026-03-28T10:09:00Z',
        selected: false,
      },
      {
        id: '4-2',
        content: 'AI data analytics can help teachers optimize curriculum design',
        groupId: '4',
        timestamp: '2026-03-28T10:11:00Z',
        selected: false,
      },
    ],
  },
];

export function DiscussionMonitor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [discussion, setDiscussion] = useState<Discussion>(mockDiscussion);
  const [groups, setGroups] = useState<Group[]>(mockGroups);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editedTopic, setEditedTopic] = useState(discussion.topic);
  const [currentTime, setCurrentTime] = useState(0);
  const [sortBy, setSortBy] = useState<'time' | 'group'>('time');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  // Timer effect
  useEffect(() => {
    if (discussion.status === 'active') {
      const interval = setInterval(() => {
        setCurrentTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [discussion.status]);

  const handleStartPause = () => {
    if (discussion.status === 'draft' || discussion.status === 'paused') {
      setDiscussion({ ...discussion, status: 'active', startTime: Date.now() });
    } else if (discussion.status === 'active') {
      setDiscussion({ ...discussion, status: 'paused' });
    }
  };

  const handleStop = () => {
    setDiscussion({ ...discussion, status: 'completed', duration: currentTime });
  };

  const handleSaveTopic = () => {
    setDiscussion({ ...discussion, topic: editedTopic });
    setIsEditingTopic(false);
  };

  const handleToggleGroupSelection = (groupId: string) => {
    setGroups(
      groups.map((group) =>
        group.id === groupId ? { ...group, selected: !group.selected } : group
      )
    );
  };

  const handleToggleIdeaSelection = (groupId: string, ideaId: string) => {
    setGroups(
      groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              ideas: group.ideas.map((idea) =>
                idea.id === ideaId ? { ...idea, selected: !idea.selected } : idea
              ),
            }
          : group
      )
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Get all ideas with group info
  const getAllIdeas = () => {
    const allIdeas: (Idea & { groupName: string; groupColor: string })[] = [];
    groups.forEach((group) => {
      group.ideas.forEach((idea) => {
        allIdeas.push({
          ...idea,
          groupName: group.name,
          groupColor: group.color,
        });
      });
    });
    return allIdeas;
  };

  // Sort and filter ideas
  const getSortedFilteredIdeas = () => {
    let ideas = getAllIdeas();

    if (filterGroup !== 'all') {
      ideas = ideas.filter((idea) => idea.groupId === filterGroup);
    }

    if (sortBy === 'time') {
      ideas.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else {
      ideas.sort((a, b) => a.groupName.localeCompare(b.groupName));
    }

    return ideas;
  };

  // Get selected items for sharing
  const getSelectedForSharing = () => {
    const items: Array<{ type: 'group' | 'idea'; id: string; name: string; order: number }> = [];
    let order = 0;

    groups.forEach((group) => {
      if (group.selected) {
        items.push({ type: 'group', id: group.id, name: group.name, order: order++ });
      }
      group.ideas.forEach((idea) => {
        if (idea.selected && !group.selected) {
          items.push({
            type: 'idea',
            id: idea.id,
            name: `${group.name} - ${idea.content.substring(0, 50)}...`,
            order: order++,
          });
        }
      });
    });

    return items;
  };

  const [shareItems, setShareItems] = useState(getSelectedForSharing());

  useEffect(() => {
    setShareItems(getSelectedForSharing());
  }, [groups]);

  const moveShareItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...shareItems];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newItems.length) {
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      newItems.forEach((item, i) => {
        item.order = i;
      });
      setShareItems(newItems);
    }
  };

  const getJoinUrl = (code: string) => {
    return `${window.location.origin}/join/${code}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const selectedGroups = groups.filter((g) => g.selected);
  const selectedIdeas = getAllIdeas().filter((i) => i.selected && !groups.find(g => g.id === i.groupId)?.selected);
  const totalSelected = selectedGroups.length + selectedIdeas.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl text-slate-900">{discussion.title}</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJoinDialog(true)}
              className="border-slate-300"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Join Info
            </Button>
            <Badge
              className={`${
                discussion.status === 'active'
                  ? 'bg-emerald-600'
                  : discussion.status === 'paused'
                  ? 'bg-amber-600'
                  : discussion.status === 'completed'
                  ? 'bg-slate-600'
                  : 'bg-blue-600'
              } text-white`}
            >
              {discussion.status === 'active'
                ? 'Active'
                : discussion.status === 'paused'
                ? 'Paused'
                : discussion.status === 'completed'
                ? 'Completed'
                : 'Draft'}
            </Badge>
          </div>

          {/* Topic Section */}
          <div className="mb-4">
            {isEditingTopic ? (
              <div className="space-y-2">
                <Textarea
                  value={editedTopic}
                  onChange={(e) => setEditedTopic(e.target.value)}
                  rows={3}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveTopic} className="bg-slate-900 hover:bg-slate-800">
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditedTopic(discussion.topic);
                      setIsEditingTopic(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-slate-700">{discussion.topic}</p>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingTopic(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Timer and Controls */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3 text-3xl font-mono text-slate-900">
              <Clock className="h-7 w-7 text-slate-600" />
              {formatTime(currentTime)}
            </div>
            <div className="flex gap-2">
              {discussion.status !== 'completed' && (
                <>
                  <Button onClick={handleStartPause} className="bg-slate-900 hover:bg-slate-800">
                    {discussion.status === 'active' ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleStop} className="border-slate-300">
                    <Square className="h-4 w-4 mr-2" />
                    End
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Groups Overview */}
          <div className="lg:col-span-1">
            <Card className="p-4 border-slate-200">
              <h2 className="text-lg mb-4 flex items-center gap-2 text-slate-900">
                <Users className="h-5 w-5" />
                Groups Overview
              </h2>
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-3 rounded-lg transition-all border ${
                      group.selected
                        ? 'bg-slate-100 border-slate-400'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox
                        checked={group.selected}
                        onCheckedChange={() => handleToggleGroupSelection(group.id)}
                      />
                      <div className={`w-3 h-3 rounded-full ${group.color}`} />
                      <span className="flex-1 text-slate-900">{group.name}</span>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                        {group.ideas.length}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Selected for Sharing */}
            {totalSelected > 0 && (
              <Card className="p-4 mt-4 border-slate-200">
                <h2 className="text-lg mb-4 flex items-center gap-2 text-slate-900">
                  <Share2 className="h-5 w-5" />
                  Selected for Sharing ({totalSelected})
                </h2>
                <div className="space-y-2 mb-4">
                  {shareItems.slice(0, 3).map((item, index) => (
                    <div key={item.id} className="text-sm p-2 bg-slate-100 rounded border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">#{index + 1}</span>
                        <span className="text-slate-700 line-clamp-1">{item.name}</span>
                      </div>
                    </div>
                  ))}
                  {shareItems.length > 3 && (
                    <p className="text-xs text-slate-500 text-center">
                      +{shareItems.length - 3} more
                    </p>
                  )}
                </div>
                <Button
                  className="w-full bg-slate-900 hover:bg-slate-800"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Manage Sharing Order
                </Button>
              </Card>
            )}
          </div>

          {/* Right: Ideas List */}
          <div className="lg:col-span-2">
            <Card className="p-4 border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <h2 className="text-lg flex items-center gap-2 text-slate-900">
                  <Lightbulb className="h-5 w-5" />
                  Group Ideas ({getAllIdeas().length})
                </h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={filterGroup} onValueChange={setFilterGroup}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortBy(sortBy === 'time' ? 'group' : 'time')}
                    className="border-slate-300"
                  >
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    {sortBy === 'time' ? 'By Time' : 'By Group'}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {getSortedFilteredIdeas().map((idea) => {
                  const group = groups.find((g) => g.id === idea.groupId);
                  const isGroupSelected = group?.selected;
                  return (
                    <div
                      key={idea.id}
                      className={`p-4 border rounded-lg transition-all ${
                        idea.selected || isGroupSelected
                          ? 'border-slate-400 bg-slate-50'
                          : 'bg-white border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={idea.selected || isGroupSelected}
                          onCheckedChange={() => handleToggleIdeaSelection(idea.groupId, idea.id)}
                          disabled={isGroupSelected}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${idea.groupColor}`} />
                            <span className="text-sm text-slate-900">{idea.groupName}</span>
                            <span className="text-xs text-slate-500">
                              {formatTimestamp(idea.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-700">{idea.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Sharing Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-600">
              Arrange the order in which groups and ideas will be shared during presentation
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {shareItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <GripVertical className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-500 font-mono text-sm">#{index + 1}</span>
                  <span className="flex-1 text-slate-900">{item.name}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveShareItem(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveShareItem(index, 'down')}
                      disabled={index === shareItems.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                Close
              </Button>
              <Button onClick={() => setShowShareDialog(false)} className="bg-slate-900 hover:bg-slate-800">
                Save Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Info Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Student Join Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Join Code */}
            <div className="space-y-2">
              <Label>Join Code</Label>
              <div className="flex gap-2">
                <Input value={discussion.joinCode} readOnly className="font-mono text-lg" />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(discussion.joinCode)}
                >
                  Copy
                </Button>
              </div>
            </div>

            {/* Join URL */}
            <div className="space-y-2">
              <Label>Join URL</Label>
              <div className="flex gap-2">
                <Input value={getJoinUrl(discussion.joinCode)} readOnly className="text-sm" />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(getJoinUrl(discussion.joinCode))}
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
                  value={getJoinUrl(discussion.joinCode)}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
