import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Filter, Save, X, ExternalLink } from 'lucide-react';
import { RSSFeed } from '../../types';

interface FeedFormData {
  title: string;
  url: string;
  category?: string;
  isActive: boolean;
}

export default function FeedManagement() {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFeed, setEditingFeed] = useState<RSSFeed | null>(null);
  const [formData, setFormData] = useState<FeedFormData>({
    title: '',
    url: '',
    category: '',
    isActive: true
  });

  // Load feeds from localStorage on component mount
  useEffect(() => {
    const savedFeeds = localStorage.getItem('rss-feeds');
    if (savedFeeds) {
      try {
        setFeeds(JSON.parse(savedFeeds));
      } catch (error) {
        console.error('Error loading feeds from localStorage:', error);
      }
    }
  }, []);

  // Save feeds to localStorage whenever feeds change
  useEffect(() => {
    localStorage.setItem('rss-feeds', JSON.stringify(feeds));
  }, [feeds]);

  // Get unique categories from feeds
  const categories = Array.from(new Set(feeds.map(feed => {
    const title = feed.title.toLowerCase();
    if (title.includes('politics') || title.includes('politico')) return 'Politics';
    if (title.includes('business') || title.includes('finance') || title.includes('economic')) return 'Business';
    if (title.includes('tech') || title.includes('technology') || title.includes('cshub') || title.includes('cyber')) return 'Technology';
    if (title.includes('sport') || title.includes('espn') || title.includes('game')) return 'Sports';
    if (title.includes('health') || title.includes('medical') || title.includes('science')) return 'Health & Science';
    if (title.includes('entertainment') || title.includes('hollywood') || title.includes('variety')) return 'Entertainment';
    return 'General';
  })));

  // Filter feeds
  const filteredFeeds = feeds.filter(feed => {
    const matchesSearch = feed.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feed.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    const feedCategory = (() => {
      const title = feed.title.toLowerCase();
      if (title.includes('politics') || title.includes('politico')) return 'Politics';
      if (title.includes('business') || title.includes('finance') || title.includes('economic')) return 'Business';
      if (title.includes('tech') || title.includes('technology') || title.includes('cshub') || title.includes('cyber')) return 'Technology';
      if (title.includes('sport') || title.includes('espn') || title.includes('game')) return 'Sports';
      if (title.includes('health') || title.includes('medical') || title.includes('science')) return 'Health & Science';
      if (title.includes('entertainment') || title.includes('hollywood') || title.includes('variety')) return 'Entertainment';
      return 'General';
    })();
    
    const matchesCategory = filterCategory === 'all' || feedCategory === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && feed.isActive) ||
                         (filterStatus === 'inactive' && !feed.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleAddFeed = () => {
    if (!formData.title.trim() || !formData.url.trim()) return;
    
    const newFeed: RSSFeed = {
      id: Date.now().toString(),
      title: formData.title.trim(),
      url: formData.url.trim(),
      category: formData.category,
      isActive: formData.isActive
    };
    
    setFeeds(prev => [...prev, newFeed]);
    resetForm();
  };

  const handleEditFeed = () => {
    if (!editingFeed || !formData.title.trim() || !formData.url.trim()) return;
    
    setFeeds(prev => prev.map(feed => 
      feed.id === editingFeed.id 
        ? { ...feed, title: formData.title.trim(), url: formData.url.trim(), category: formData.category, isActive: formData.isActive }
        : feed
    ));
    resetForm();
  };

  const handleDeleteFeed = (feedId: string) => {
    if (confirm('Are you sure you want to delete this feed?')) {
      setFeeds(prev => prev.filter(feed => feed.id !== feedId));
    }
  };

  const handleToggleFeed = (feedId: string) => {
    setFeeds(prev => prev.map(feed =>
      feed.id === feedId ? { ...feed, isActive: !feed.isActive } : feed
    ));
  };

  const startEdit = (feed: RSSFeed) => {
    setEditingFeed(feed);
    setFormData({
      title: feed.title,
      url: feed.url,
      category: feed.category || '',
      isActive: feed.isActive
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({ title: '', url: '', category: '', isActive: true });
    setShowAddForm(false);
    setEditingFeed(null);
  };

  const removeDuplicates = () => {
    const seen = new Set();
    const uniqueFeeds = feeds.filter(feed => {
      const key = feed.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    
    if (uniqueFeeds.length !== feeds.length) {
      setFeeds(uniqueFeeds);
      alert(`Removed ${feeds.length - uniqueFeeds.length} duplicate feeds`);
    } else {
      alert('No duplicate feeds found');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">RSS Feed Management</h2>
            <p className="text-gray-600">Manage your RSS feed sources</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={removeDuplicates}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Remove Duplicates
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Add Feed
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{feeds.length}</div>
            <div className="text-sm text-blue-600">Total Feeds</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{feeds.filter(f => f.isActive).length}</div>
            <div className="text-sm text-green-600">Active Feeds</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{feeds.filter(f => !f.isActive).length}</div>
            <div className="text-sm text-red-600">Inactive Feeds</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
            <div className="text-sm text-purple-600">Categories</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search feeds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingFeed ? 'Edit Feed' : 'Add New Feed'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feed Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter feed title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feed URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/rss"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category (Optional)</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Technology, Politics"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={editingFeed ? handleEditFeed : handleAddFeed}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={16} className="mr-2" />
              {editingFeed ? 'Update Feed' : 'Add Feed'}
            </button>
          </div>
        </div>
      )}

      {/* Feed List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Feeds ({filteredFeeds.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFeeds.map(feed => {
                const feedCategory = (() => {
                  const title = feed.title.toLowerCase();
                  if (title.includes('politics') || title.includes('politico')) return 'Politics';
                  if (title.includes('business') || title.includes('finance') || title.includes('economic')) return 'Business';
                  if (title.includes('tech') || title.includes('technology') || title.includes('cshub') || title.includes('cyber')) return 'Technology';
                  if (title.includes('sport') || title.includes('espn') || title.includes('game')) return 'Sports';
                  if (title.includes('health') || title.includes('medical') || title.includes('science')) return 'Health & Science';
                  if (title.includes('entertainment') || title.includes('hollywood') || title.includes('variety')) return 'Entertainment';
                  return 'General';
                })();

                return (
                  <tr key={feed.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{feed.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{feed.url}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {feedCategory}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        feed.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {feed.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleFeed(feed.id)}
                          className={`p-1 rounded ${
                            feed.isActive 
                              ? 'text-green-600 hover:bg-green-100' 
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={feed.isActive ? 'Deactivate feed' : 'Activate feed'}
                        >
                          {feed.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <a
                          href={feed.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          title="Open feed URL"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button
                          onClick={() => startEdit(feed)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit feed"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteFeed(feed.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Delete feed"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredFeeds.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">No feeds found</div>
              <p className="text-sm text-gray-500">
                {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Add your first RSS feed to get started'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}