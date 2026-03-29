import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Users, Send, Lightbulb, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Discussion, Group, Idea } from '../types';

// Mock data
const mockDiscussion: Discussion = {
  id: '1',
  title: 'AI Applications in Modern Education',
  topic: 'Discuss how artificial intelligence is transforming traditional education models, including personalized learning and intelligent assessment systems',
  createdAt: '2026-03-28T10:00:00Z',
  status: 'active',
  duration: 0,
  joinCode: 'ABC123',
  startTime: Date.now(),
};

const mockGroups: Group[] = [
  { id: '1', name: 'Group A', discussionId: '1', color: 'bg-slate-700', selected: false, ideas: [] },
  { id: '2', name: 'Group B', discussionId: '1', color: 'bg-slate-600', selected: false, ideas: [] },
  { id: '3', name: 'Group C', discussionId: '1', color: 'bg-slate-500', selected: false, ideas: [] },
  { id: '4', name: 'Group D', discussionId: '1', color: 'bg-slate-400', selected: false, ideas: [] },
];

export function StudentView() {
  const { code } = useParams();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [groups, setGroups] = useState<Group[]>(mockGroups);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    // Simulate fetching discussion
    setDiscussion(mockDiscussion);
  }, [code]);

  // Timer effect
  useEffect(() => {
    if (discussion?.status === 'active') {
      const interval = setInterval(() => {
        setCurrentTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [discussion?.status]);

  const handleJoin = () => {
    if (studentName.trim() && selectedGroup) {
      setHasJoined(true);
    }
  };

  const handleSubmitIdea = () => {
    if (newIdea.trim()) {
      const idea: Idea = {
        id: Date.now().toString(),
        content: newIdea,
        groupId: selectedGroup,
        timestamp: new Date().toISOString(),
        selected: false,
      };
      setMyIdeas([...myIdeas, idea]);
      setNewIdea('');
    }
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

  if (!discussion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center border-slate-200">
          <p className="text-slate-600">Loading discussion...</p>
        </Card>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full border-slate-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl mb-2 text-slate-900">Join Discussion</h1>
            <p className="text-slate-600">{discussion.title}</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-700 mb-1">Discussion Topic:</p>
              <p className="text-sm text-slate-600">{discussion.topic}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your name..."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Select Your Group</Label>
              <select
                id="group"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md bg-white text-slate-900"
              >
                <option value="">Choose a group...</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              className="w-full bg-slate-900 hover:bg-slate-800"
              onClick={handleJoin}
              disabled={!studentName.trim() || !selectedGroup}
            >
              Join Discussion
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentGroup = groups.find((g) => g.id === selectedGroup);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${currentGroup?.color} rounded-full flex items-center justify-center`}>
                <span className="text-white font-medium">{studentName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm text-slate-600">Welcome, {studentName}</p>
                <p className="font-medium text-slate-900">{currentGroup?.name}</p>
              </div>
            </div>
            <Badge
              className={`${
                discussion.status === 'active'
                  ? 'bg-emerald-600'
                  : discussion.status === 'paused'
                  ? 'bg-amber-600'
                  : 'bg-slate-600'
              } text-white`}
            >
              {discussion.status === 'active'
                ? 'Active'
                : discussion.status === 'paused'
                ? 'Paused'
                : 'Completed'}
            </Badge>
          </div>

          <h1 className="text-xl mb-2 text-slate-900">{discussion.title}</h1>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(currentTime)}
            </span>
            <span className="flex items-center gap-1">
              <Lightbulb className="h-4 w-4" />
              {myIdeas.length} ideas submitted
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Topic & Submit */}
          <div className="lg:col-span-2 space-y-6">
            {/* Topic */}
            <Card className="p-6 border-slate-200">
              <h2 className="text-lg mb-3 text-slate-900">Discussion Topic</h2>
              <p className="text-slate-700">{discussion.topic}</p>
            </Card>

            {/* Submit Idea */}
            {discussion.status !== 'completed' && (
              <Card className="p-6 border-slate-200">
                <h2 className="text-lg mb-4 text-slate-900 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Share Your Idea
                </h2>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Type your idea here..."
                    value={newIdea}
                    onChange={(e) => setNewIdea(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <Button
                    onClick={handleSubmitIdea}
                    disabled={!newIdea.trim()}
                    className="w-full bg-slate-900 hover:bg-slate-800"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Idea
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right: My Ideas */}
          <div className="lg:col-span-1">
            <Card className="p-4 border-slate-200">
              <h2 className="text-lg mb-4 text-slate-900">My Ideas</h2>
              {myIdeas.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Lightbulb className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No ideas submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myIdeas.map((idea, index) => (
                    <div key={idea.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs text-slate-500">Idea #{index + 1}</span>
                        <span className="text-xs text-slate-500">{formatTimestamp(idea.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-700">{idea.content}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span className="text-xs text-emerald-600">Submitted</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Completion Message */}
        {discussion.status === 'completed' && (
          <Card className="p-8 mt-6 text-center border-slate-200">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-600" />
            <h2 className="text-2xl mb-2 text-slate-900">Discussion Completed</h2>
            <p className="text-slate-600">
              Thank you for your participation! You submitted {myIdeas.length} idea
              {myIdeas.length !== 1 ? 's' : ''}.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
