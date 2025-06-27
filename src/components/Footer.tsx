import React from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Github, Twitter, Mail, Rss, Search, Shield } from 'lucide-react';
import { categoryConfigs } from '../utils/categorizer';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Newspaper size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">NewsHub</h3>
                <p className="text-gray-400 text-sm">Your News Aggregator</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Stay informed with the latest news from multiple sources, powered by RSS feeds and AI-powered search.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors flex items-center">
                  <Rss size={16} className="mr-2" />
                  RSS News
                </Link>
              </li>
              <li>
                <Link to="/ai-news" className="text-gray-300 hover:text-white transition-colors flex items-center">
                  <Search size={16} className="mr-2" />
                  AI News Search
                </Link>
              </li>
              <li>
                <a href="#about" className="text-gray-300 hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Categories</h4>
            <div className="grid grid-cols-2 gap-2">
              {categoryConfigs.slice(0, 6).map(category => (
                <span
                  key={category.name}
                  className="text-gray-300 hover:text-white transition-colors text-sm cursor-pointer"
                >
                  {category.name}
                </span>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Stay Updated</h4>
            <p className="text-gray-300 text-sm">
              Get the latest news updates delivered to your inbox.
            </p>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} NewsHub. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
              Privacy Policy
            </a>
            <a href="#terms" className="text-gray-400 hover:text-white transition-colors text-sm">
              Terms of Service
            </a>
            <a href="#cookies" className="text-gray-400 hover:text-white transition-colors text-sm">
              Cookie Policy
            </a>
            <Link 
              to="/admin" 
              className="text-gray-400 hover:text-red-400 transition-colors text-sm flex items-center"
            >
              <Shield size={14} className="mr-1" />
              .ignition
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}