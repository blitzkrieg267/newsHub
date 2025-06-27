import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { RSSFeed } from '../../types';

interface ImportResult {
  success: number;
  errors: string[];
  duplicates: number;
}

export default function BulkFeedImport() {
  const [importData, setImportData] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const jsonTemplate = {
    feeds: [
      {
        title: "Example News Feed",
        url: "https://example.com/rss",
        category: "Technology",
        isActive: true
      },
      {
        title: "Another News Source",
        url: "https://another-example.com/feed.xml",
        category: "Politics",
        isActive: false
      }
    ]
  };

  const handleImport = async () => {
    if (!importData.trim()) return;
    
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const data = JSON.parse(importData);
      
      if (!data.feeds || !Array.isArray(data.feeds)) {
        throw new Error('Invalid JSON format. Expected "feeds" array.');
      }
      
      // Load existing feeds
      const existingFeeds: RSSFeed[] = JSON.parse(localStorage.getItem('rss-feeds') || '[]');
      const existingUrls = new Set(existingFeeds.map(feed => feed.url.toLowerCase()));
      
      let success = 0;
      let duplicates = 0;
      const errors: string[] = [];
      const newFeeds: RSSFeed[] = [];
      
      data.feeds.forEach((feedData: any, index: number) => {
        try {
          // Validate required fields
          if (!feedData.title || !feedData.url) {
            errors.push(`Feed ${index + 1}: Missing title or URL`);
            return;
          }
          
          // Check for duplicates
          if (existingUrls.has(feedData.url.toLowerCase())) {
            duplicates++;
            return;
          }
          
          // Create new feed
          const newFeed: RSSFeed = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: feedData.title.trim(),
            url: feedData.url.trim(),
            category: feedData.category || undefined,
            isActive: feedData.isActive !== false // Default to true
          };
          
          newFeeds.push(newFeed);
          existingUrls.add(newFeed.url.toLowerCase());
          success++;
        } catch (error) {
          errors.push(`Feed ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      });
      
      // Save updated feeds
      const updatedFeeds = [...existingFeeds, ...newFeeds];
      localStorage.setItem('rss-feeds', JSON.stringify(updatedFeeds));
      
      setImportResult({ success, errors, duplicates });
      
      if (success > 0) {
        setImportData(''); // Clear the input on successful import
      }
    } catch (error) {
      setImportResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Invalid JSON format'],
        duplicates: 0
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    const existingFeeds: RSSFeed[] = JSON.parse(localStorage.getItem('rss-feeds') || '[]');
    const exportData = {
      feeds: existingFeeds.map(feed => ({
        title: feed.title,
        url: feed.url,
        category: feed.category,
        isActive: feed.isActive
      })),
      exported_at: new Date().toISOString(),
      total_feeds: existingFeeds.length
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rss-feeds-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(jsonTemplate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rss-feeds-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Feed Import/Export</h2>
            <p className="text-gray-600">Import multiple RSS feeds from JSON or export existing feeds</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={downloadTemplate}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FileText size={16} className="mr-2" />
              Download Template
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} className="mr-2" />
              Export Feeds
            </button>
          </div>
        </div>

        {/* JSON Template Display */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">JSON Template Structure:</h3>
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {JSON.stringify(jsonTemplate, null, 2)}
          </pre>
        </div>

        {/* Import Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Import Instructions:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use the JSON template structure shown above</li>
            <li>• Each feed must have a "title" and "url" field</li>
            <li>• "category" and "isActive" fields are optional</li>
            <li>• Duplicate URLs will be automatically skipped</li>
            <li>• Invalid entries will be reported in the results</li>
          </ul>
        </div>
      </div>

      {/* Import Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Feeds</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JSON Data
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Paste your JSON data here..."
            />
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={!importData.trim() || isImporting}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Import Feeds
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Import Results</h3>
            <button
              onClick={() => setImportResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Success */}
            {importResult.success > 0 && (
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="text-green-500 mr-3" size={20} />
                <span className="text-green-800">
                  Successfully imported {importResult.success} feed{importResult.success !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            {/* Duplicates */}
            {importResult.duplicates > 0 && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="text-yellow-500 mr-3" size={20} />
                <span className="text-yellow-800">
                  Skipped {importResult.duplicates} duplicate feed{importResult.duplicates !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertCircle className="text-red-500 mr-2" size={20} />
                  <span className="text-red-800 font-medium">
                    {importResult.errors.length} error{importResult.errors.length !== 1 ? 's' : ''}:
                  </span>
                </div>
                <ul className="text-sm text-red-700 space-y-1 ml-6">
                  {importResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}