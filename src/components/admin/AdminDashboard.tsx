import React, { useState } from 'react';
import { Shield, Database, Rss, Upload, Download, Trash2, Plus, Settings } from 'lucide-react';
import FeedManagement from './FeedManagement';
import BulkFeedImport from './BulkFeedImport';

type AdminTab = 'feeds' | 'bulk-import' | 'settings';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('feeds');

  const tabs = [
    { id: 'feeds' as AdminTab, label: 'Feed Management', icon: Rss },
    { id: 'bulk-import' as AdminTab, label: 'Bulk Import', icon: Upload },
    { id: 'settings' as AdminTab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center">
            <Shield className="mr-3 text-red-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage RSS feeds and system configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} className="mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'feeds' && <FeedManagement />}
        {activeTab === 'bulk-import' && <BulkFeedImport />}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">System Settings</h2>
            <p className="text-gray-600">System configuration options will be available here.</p>
          </div>
        )}
      </div>
    </div>
  );
}