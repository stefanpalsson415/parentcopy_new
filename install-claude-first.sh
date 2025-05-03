#!/bin/bash
# install-claude-first.sh - Script to install the Claude-first approach

# Ensure script executes from the project root
cd "$(dirname "$0")"

echo "📝 Installing Claude-first Approach..."

# Backup original files
echo "📁 Backing up original files..."
cp src/services/EnhancedChatService.js src/services/EnhancedChatService.js.bak
cp src/services/ClaudeResponseParser.js src/services/ClaudeResponseParser.js.bak 2>/dev/null || true

# Install new files
echo "📥 Installing new files..."
mv src/services/EnhancedChatService.js.new src/services/EnhancedChatService.js

# Install the updated IntentActionService
echo "🔄 Updating IntentActionService.js with babysitter detection improvements..."
# This was already done in the prior implementation

echo "✅ Claude-first approach installed successfully!"
echo "🚀 To test, start your development server and try sending a message to Allie."
echo "📋 Example tests:"
echo "  - 'Can you add a new babysitter for Lily? Her name is Martha.'"
echo "  - 'Add a doctor appointment on Tuesday at 3pm'"
echo "  - 'What's on my calendar for this week?'"
echo ""
echo "💡 This implementation makes Claude the primary understanding layer rather than"
echo "   falling back to it after regex pattern matching fails. This approach should"
echo "   give you more natural and accurate responses for all requests."

chmod +x install-claude-first.sh