/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MissionControlPage } from './components/pages/MissionControlPage';
import { MemoryExplorerPage } from './components/pages/MemoryExplorerPage';
import { KnowledgeGraphPage } from './components/pages/KnowledgeGraphPage';
import { DecisionTimelinePage } from './components/pages/DecisionTimelinePage';
import { ProjectsPage } from './components/pages/ProjectsPage';
import { CommitmentsPage } from './components/pages/CommitmentsPage';
import { ConflictsPage } from './components/pages/ConflictsPage';
import { ActivityHistoryPage } from './components/pages/ActivityHistoryPage';
import { MemoryAssistantPage } from './components/pages/MemoryAssistantPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { CaptureMemoryModal } from './components/common/CaptureMemoryModal';
import { CommandPaletteModal } from './components/common/CommandPaletteModal';
import { useContextOSStore } from './services/dataStore';
import { NavigationPage } from './types';

export default function App() {
  const { state, metrics, actions } = useContextOSStore();

  const [currentPage, setCurrentPage] = useState<NavigationPage>('mission-control');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Global Modals
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Handlers
  const handleOpenProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentPage('projects');
  };

  const handleNavigate = (page: NavigationPage) => {
    setCurrentPage(page);
    if (page !== 'projects') {
      setSelectedProjectId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1F2E] text-[#E1CBD7] flex antialiased">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        openCaptureModal={() => setIsCaptureModalOpen(true)}
        openCommandPalette={() => setIsCommandPaletteOpen(true)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-150 ${
          isSidebarCollapsed ? 'ml-16' : 'ml-[230px]'
        }`}
      >
        {/* Top Header */}
        <Header
          currentPage={currentPage}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenCaptureModal={() => setIsCaptureModalOpen(true)}
          onNavigate={handleNavigate}
        />

        {/* Page Content Viewport */}
        <main
          className={`flex-1 w-full ${
            currentPage === 'assistant'
              ? 'p-0 overflow-y-auto'
              : 'px-6 py-6 max-w-7xl mx-auto'
          }`}
        >
          {currentPage === 'mission-control' && (
            <MissionControlPage
              metrics={metrics}
              projects={state.projects}
              activities={state.activities}
              conflicts={state.conflicts}
              memories={state.memories}
              decisions={state.decisions}
              commitments={state.commitments}
              onOpenProject={handleOpenProject}
              onOpenCapture={() => setIsCaptureModalOpen(true)}
              onNavigate={handleNavigate}
              onResolveConflict={actions.resolveConflict}
            />
          )}

          {currentPage === 'memory-explorer' && (
            <MemoryExplorerPage
              memories={state.memories}
              projects={state.projects}
              onAddMemory={() => setIsCaptureModalOpen(true)}
              onUpdateMemory={actions.updateMemory}
              onDeleteMemory={actions.deleteMemory}
              onSupersedeMemory={actions.supersedeMemory}
            />
          )}

          {currentPage === 'knowledge-graph' && (
            <KnowledgeGraphPage
              projects={state.projects}
              memories={state.memories}
              decisions={state.decisions}
              commitments={state.commitments}
              onOpenMemory={(id) => {
                handleNavigate('memory-explorer');
              }}
            />
          )}

          {currentPage === 'decision-timeline' && (
            <DecisionTimelinePage
              decisions={state.decisions}
              projects={state.projects}
              memories={state.memories}
              onAddDecision={actions.addDecision}
              onSupersedeDecision={actions.supersedeDecision}
              onUpdateDecision={actions.updateDecision}
            />
          )}

          {currentPage === 'projects' && (
            <ProjectsPage
              projects={state.projects}
              memories={state.memories}
              decisions={state.decisions}
              commitments={state.commitments}
              activities={state.activities}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onAddProject={actions.addProject}
              onUpdateProject={actions.updateProject}
              onToggleCommitment={actions.toggleCommitmentStatus}
              onOpenCapture={() => setIsCaptureModalOpen(true)}
            />
          )}

          {currentPage === 'commitments' && (
            <CommitmentsPage
              commitments={state.commitments}
              projects={state.projects}
              memories={state.memories}
              onAddCommitment={actions.addCommitment}
              onToggleCommitment={actions.toggleCommitmentStatus}
              onUpdateCommitment={actions.updateCommitment}
              onDeleteCommitment={actions.deleteCommitment}
            />
          )}

          {currentPage === 'conflicts' && (
            <ConflictsPage
              conflicts={state.conflicts}
              memories={state.memories}
              decisions={state.decisions}
              onResolveConflict={actions.resolveConflict}
              onDismissConflict={actions.dismissConflict}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'activity' && (
            <ActivityHistoryPage
              activities={state.activities}
              projects={state.projects}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'assistant' && (
            <MemoryAssistantPage
              projects={state.projects}
              memories={state.memories}
              decisions={state.decisions}
              commitments={state.commitments}
              conflicts={state.conflicts}
              onNavigate={handleNavigate}
              onOpenMemory={(id) => {
                handleNavigate('memory-explorer');
              }}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsPage
              onResetDemoData={actions.resetToDemoData}
              onExportJson={actions.exportDataJson}
              onImportJson={actions.importDataJson}
            />
          )}
        </main>
      </div>

      {/* Global Capture Memory Modal */}
      <CaptureMemoryModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        projects={state.projects}
        onSave={(data) => {
          actions.addMemory(data);
        }}
      />

      {/* Global Command Palette */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onOpenCapture={() => setIsCaptureModalOpen(true)}
      />
    </div>
  );
}
