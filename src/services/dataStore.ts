import { useState, useEffect } from 'react';
import {
  ProjectContext,
  Memory,
  Decision,
  Commitment,
  ActivityEvent,
  MemoryConflict,
  MemoryType,
  ValidityStatus
} from '../types';
import {
  INITIAL_PROJECTS,
  INITIAL_MEMORIES,
  INITIAL_DECISIONS,
  INITIAL_COMMITMENTS,
  INITIAL_ACTIVITIES,
  INITIAL_CONFLICTS
} from './mockData';
import { ConflictDetector } from './conflictDetector';
import { formatRelativeTime, calculateDaysOverdue, getStartOfDay } from '../utils/dateUtils';

export interface AppDataState {
  version?: number;
  projects: ProjectContext[];
  memories: Memory[];
  decisions: Decision[];
  commitments: Commitment[];
  activities: ActivityEvent[];
  conflicts: MemoryConflict[];
}

export interface DecisionLineage {
  decision: Decision;
  predecessors: Decision[];
  successors: Decision[];
  sourceMemories: Memory[];
  dependentCommitments: Commitment[];
}

export interface MemoryLineage {
  memory: Memory;
  predecessors: Memory[];
  successors: Memory[];
  relatedMemories: Memory[];
  dependentDecisions: Decision[];
}

const STORAGE_KEY = 'contextos_data_store_v2';
const LEGACY_STORAGE_KEY = 'contextos_data_store_v1';

class DataStoreManager {
  private state: AppDataState;
  private listeners: Set<() => void> = new Set();
  private idCounter = 1;

  constructor() {
    this.state = this.loadState();
    this.syncInitialConflicts();
  }

  // --- ID GENERATION (Guaranteed Unique & Collision-Free Across All Records) ---
  public generateUniqueId(prefix: string, existingList: { id: string }[]): string {
    const allKnownIds = new Set<string>([
      ...this.state ? this.state.memories.map((m) => m.id) : [],
      ...this.state ? this.state.decisions.map((d) => d.id) : [],
      ...this.state ? this.state.commitments.map((c) => c.id) : [],
      ...this.state ? this.state.projects.map((p) => p.id) : [],
      ...existingList.map((item) => item.id)
    ]);

    // Try finding maximum numeric suffix for prefix
    let maxNum = 0;
    for (const item of existingList) {
      const match = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    if (maxNum > 0) {
      let candidate = `${prefix}-${maxNum + 1}`;
      while (allKnownIds.has(candidate)) {
        maxNum++;
        candidate = `${prefix}-${maxNum + 1}`;
      }
      return candidate;
    }

    // Fallback: timestamp + sequence
    let candidate = `${prefix}-${Date.now().toString().slice(-4)}${this.idCounter++}`;
    while (allKnownIds.has(candidate)) {
      candidate = `${prefix}-${Date.now().toString().slice(-4)}${this.idCounter++}`;
    }
    return candidate;
  }

  // --- SAFE MIGRATION & INTEGRITY SANITIZATION ---
  private loadState(): AppDataState {
    try {
      const storage = typeof localStorage !== 'undefined' ? localStorage : null;
      let stored = storage?.getItem(STORAGE_KEY);
      if (!stored && storage) {
        // Check for legacy v1 storage for clean migration
        stored = storage.getItem(LEGACY_STORAGE_KEY);
      }

      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed.projects) &&
          Array.isArray(parsed.memories) &&
          Array.isArray(parsed.decisions) &&
          Array.isArray(parsed.commitments)
        ) {
          return this.sanitizeState(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored CONTEXTOS data, falling back to initial data', e);
    }

    return this.sanitizeState({
      version: 2,
      projects: INITIAL_PROJECTS,
      memories: INITIAL_MEMORIES,
      decisions: INITIAL_DECISIONS,
      commitments: INITIAL_COMMITMENTS,
      activities: INITIAL_ACTIVITIES,
      conflicts: INITIAL_CONFLICTS
    });
  }

  /**
   * Deeply validates and repairs references across memories, decisions, and commitments
   */
  private sanitizeState(raw: any): AppDataState {
    const rawProjects = Array.isArray(raw.projects) ? raw.projects : INITIAL_PROJECTS;
    const sanitizedProjects: ProjectContext[] = rawProjects.map((p: any) => ({
      ...p,
      goals: Array.isArray(p.goals) ? p.goals : [],
      constraints: Array.isArray(p.constraints) ? p.constraints : [],
      lastUpdated: p.lastUpdated || 'Just now',
      lastUpdatedISO: p.lastUpdatedISO || new Date().toISOString()
    }));

    const projectMap = new Map(sanitizedProjects.map((p) => [p.id, p.name]));

    const rawMemories = Array.isArray(raw.memories) ? raw.memories : INITIAL_MEMORIES;
    const memoryIdSet = new Set(rawMemories.map((m: any) => m.id));

    const sanitizedMemories: Memory[] = rawMemories.map((m: any) => {
      // Prune dangling references in relatedMemoryIds
      const validRelated = Array.isArray(m.relatedMemoryIds)
        ? m.relatedMemoryIds.filter((rId: string) => memoryIdSet.has(rId) && rId !== m.id)
        : [];

      return {
        ...m,
        projectName: projectMap.get(m.projectId) || m.projectName || 'General Context',
        tags: Array.isArray(m.tags) ? m.tags : [],
        relatedMemoryIds: validRelated,
        supersededBy: m.supersededBy && memoryIdSet.has(m.supersededBy) ? m.supersededBy : undefined,
        supersedesMemoryId: m.supersedesMemoryId && memoryIdSet.has(m.supersedesMemoryId) ? m.supersedesMemoryId : undefined
      };
    });

    const rawDecisions = Array.isArray(raw.decisions) ? raw.decisions : INITIAL_DECISIONS;
    const decisionIdSet = new Set(rawDecisions.map((d: any) => d.id));

    const sanitizedDecisions: Decision[] = rawDecisions.map((d: any) => {
      // Prune dangling sourceMemoryIds
      const validSources = Array.isArray(d.sourceMemoryIds)
        ? d.sourceMemoryIds.filter((sId: string) => memoryIdSet.has(sId))
        : [];

      return {
        ...d,
        projectName: projectMap.get(d.projectId) || d.projectName || 'General Context',
        sourceMemoryIds: validSources,
        alternativesConsidered: Array.isArray(d.alternativesConsidered) ? d.alternativesConsidered : [],
        supersededBy: d.supersededBy && decisionIdSet.has(d.supersededBy) ? d.supersededBy : undefined,
        supersedesDecisionId: d.supersedesDecisionId && decisionIdSet.has(d.supersedesDecisionId) ? d.supersedesDecisionId : undefined
      };
    });

    const rawCommitments = Array.isArray(raw.commitments) ? raw.commitments : INITIAL_COMMITMENTS;
    const sanitizedCommitments: Commitment[] = rawCommitments.map((c: any) => ({
      ...c,
      projectName: projectMap.get(c.projectId) || c.projectName || 'General Context',
      sourceMemoryId: c.sourceMemoryId && memoryIdSet.has(c.sourceMemoryId) ? c.sourceMemoryId : undefined
    }));

    const sanitizedActivities: ActivityEvent[] = Array.isArray(raw.activities)
      ? raw.activities.map((a: any) => ({
          ...a,
          timestampISO: a.timestampISO || new Date().toISOString()
        }))
      : INITIAL_ACTIVITIES;

    const sanitizedConflicts: MemoryConflict[] = Array.isArray(raw.conflicts)
      ? raw.conflicts.filter(
          (conf: any) =>
            (memoryIdSet.has(conf.memoryIdA) || decisionIdSet.has(conf.memoryIdA)) &&
            (memoryIdSet.has(conf.memoryIdB) || decisionIdSet.has(conf.memoryIdB) || projectMap.has(conf.memoryIdB))
        )
      : INITIAL_CONFLICTS;

    return {
      version: 2,
      projects: sanitizedProjects,
      memories: sanitizedMemories,
      decisions: sanitizedDecisions,
      commitments: sanitizedCommitments,
      activities: sanitizedActivities,
      conflicts: sanitizedConflicts
    };
  }

  private saveState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
    this.notify();
  }

  private syncInitialConflicts(): void {
    // Run conflict detector on startup
    const detected = ConflictDetector.detectConflicts(
      this.state.memories,
      this.state.decisions,
      this.state.conflicts,
      this.state.commitments,
      this.state.projects
    );
    if (detected.length !== this.state.conflicts.length) {
      this.state.conflicts = detected;
      this.saveState();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  public getState(): AppDataState {
    return this.state;
  }

  // --- ACTIVITY LOGGING ---
  public logActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
    const now = new Date();
    const timestampStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newActivity: ActivityEvent = {
      ...event,
      id: `ACT-${Date.now().toString().slice(-4)}${this.idCounter++}`,
      timestamp: timestampStr,
      timestampISO: now.toISOString()
    };
    this.state.activities = [newActivity, ...this.state.activities.slice(0, 49)];
  }

  // --- MEMORY OPERATIONS ---
  public addMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Memory {
    const project = this.state.projects.find((p) => p.id === memory.projectId);
    const id = this.generateUniqueId('MEM', this.state.memories);
    const now = new Date().toISOString();

    const newMemory: Memory = {
      ...memory,
      id,
      projectName: project ? project.name : 'General Context',
      createdAt: now,
      updatedAt: now,
      relatedMemoryIds: memory.relatedMemoryIds || [],
      tags: memory.tags || []
    };

    this.state.memories = [newMemory, ...this.state.memories];

    this.logActivity({
      type: 'MEMORY_CREATED',
      title: `Memory Captured: ${newMemory.title}`,
      description: newMemory.content.slice(0, 90) + (newMemory.content.length > 90 ? '...' : ''),
      projectId: newMemory.projectId,
      projectName: newMemory.projectName || 'General Context',
      relatedId: newMemory.id,
      severity: 'info'
    });

    // Re-evaluate conflicts
    this.recheckConflicts();
    this.saveState();
    return newMemory;
  }

  public updateMemory(id: string, updates: Partial<Omit<Memory, 'id' | 'createdAt'>>): void {
    const index = this.state.memories.findIndex((m) => m.id === id);
    if (index === -1) return;

    const existing = this.state.memories[index];
    const project = updates.projectId
      ? this.state.projects.find((p) => p.id === updates.projectId)
      : this.state.projects.find((p) => p.id === existing.projectId);

    // CRITICAL: Preserve immutable createdAt timestamp!
    const updated: Memory = {
      ...existing,
      ...updates,
      createdAt: existing.createdAt, // Guarantee createdAt is never overwritten
      projectName: project ? project.name : existing.projectName,
      updatedAt: new Date().toISOString()
    };

    this.state.memories[index] = updated;

    this.logActivity({
      type: 'MEMORY_UPDATED',
      title: `Memory Updated: ${updated.title}`,
      description: `Updated status: ${updated.validity}, confidence: ${updated.confidence}%`,
      projectId: updated.projectId,
      projectName: updated.projectName || 'General',
      relatedId: updated.id,
      severity: 'info'
    });

    this.recheckConflicts();
    this.saveState();
  }

  public deleteMemory(id: string): void {
    const memory = this.state.memories.find((m) => m.id === id);
    if (!memory) return;

    // Clean references across other memories
    this.state.memories = this.state.memories
      .filter((m) => m.id !== id)
      .map((m) => ({
        ...m,
        relatedMemoryIds: m.relatedMemoryIds.filter((rId) => rId !== id),
        supersededBy: m.supersededBy === id ? undefined : m.supersededBy,
        supersedesMemoryId: m.supersedesMemoryId === id ? undefined : m.supersedesMemoryId
      }));

    // Clean references across decisions
    this.state.decisions = this.state.decisions.map((d) => ({
      ...d,
      sourceMemoryIds: d.sourceMemoryIds.filter((sId) => sId !== id)
    }));

    // Clean references across commitments
    this.state.commitments = this.state.commitments.map((c) => ({
      ...c,
      sourceMemoryId: c.sourceMemoryId === id ? undefined : c.sourceMemoryId
    }));

    // Resolve or clean conflicts referencing deleted memory
    this.state.conflicts = this.state.conflicts.filter(
      (c) => c.memoryIdA !== id && c.memoryIdB !== id
    );

    this.logActivity({
      type: 'MEMORY_UPDATED',
      title: `Memory Deleted: ${memory.title}`,
      description: `Removed memory record ${id} and cleaned related references`,
      projectId: memory.projectId,
      projectName: memory.projectName || 'General',
      relatedId: id,
      severity: 'warning'
    });

    this.saveState();
  }

  /**
   * Multi-hop cycle prevention for memory supersession chains (A -> B -> C -> A)
   */
  public wouldFormMemoryCycle(targetId: string, supersedingId: string): boolean {
    const visited = new Set<string>();
    let currentId: string | undefined = supersedingId;

    while (currentId) {
      if (currentId === targetId) return true;
      if (visited.has(currentId)) return true;
      visited.add(currentId);
      const mem = this.state.memories.find((m) => m.id === currentId);
      currentId = mem?.supersededBy;
    }
    return false;
  }

  public supersedeMemory(targetMemoryId: string, supersedingMemoryId: string, reason?: string): void {
    const target = this.state.memories.find((m) => m.id === targetMemoryId);
    const superseding = this.state.memories.find((m) => m.id === supersedingMemoryId);
    if (!target) return;

    // Prevent multi-hop circular supersession
    if (this.wouldFormMemoryCycle(targetMemoryId, supersedingMemoryId)) {
      console.warn('Prevented circular memory supersession relationship');
      return;
    }

    target.validity = 'SUPERSEDED';
    target.supersededBy = supersedingMemoryId;
    target.updatedAt = new Date().toISOString();

    if (superseding) {
      superseding.supersedesMemoryId = targetMemoryId;
      superseding.updatedAt = new Date().toISOString();
    }

    this.logActivity({
      type: 'MEMORY_SUPERSEDED',
      title: `Memory Superseded: ${target.id}`,
      description: reason || `Superseded by memory ${supersedingMemoryId}`,
      projectId: target.projectId,
      projectName: target.projectName || 'General',
      relatedId: target.id,
      severity: 'warning'
    });

    this.recheckConflicts();
    this.saveState();
  }

  // --- DECISION OPERATIONS & LINEAGE ---
  public addDecision(decision: Omit<Decision, 'id' | 'createdAt' | 'updatedAt'>): Decision {
    const project = this.state.projects.find((p) => p.id === decision.projectId);
    const id = this.generateUniqueId('DEC', this.state.decisions);
    const now = new Date().toISOString();

    const newDecision: Decision = {
      ...decision,
      id,
      projectName: project ? project.name : 'General Context',
      createdAt: now,
      updatedAt: now,
      sourceMemoryIds: decision.sourceMemoryIds || [],
      alternativesConsidered: decision.alternativesConsidered || []
    };

    // If supersedes an earlier decision, link both sides and prevent cycles
    if (newDecision.supersedesDecisionId) {
      const earlier = this.state.decisions.find((d) => d.id === newDecision.supersedesDecisionId);
      if (earlier) {
        // Prevent circular loop
        if (this.wouldFormDecisionCycle(newDecision.id, earlier.id)) {
          console.warn('Rejected decision creation due to circular supersession cycle');
          newDecision.supersedesDecisionId = undefined;
        } else {
          earlier.status = 'SUPERSEDED';
          earlier.supersededBy = newDecision.id;
          earlier.updatedAt = now;
        }
      }
    }

    this.state.decisions = [newDecision, ...this.state.decisions];

    this.logActivity({
      type: newDecision.supersedesDecisionId ? 'DECISION_SUPERSEDED' : 'DECISION_UPDATED',
      title: `Decision Recorded: ${newDecision.title}`,
      description: newDecision.rationale.slice(0, 90) + (newDecision.rationale.length > 90 ? '...' : ''),
      projectId: newDecision.projectId,
      projectName: newDecision.projectName || 'General',
      relatedId: newDecision.id,
      severity: newDecision.supersedesDecisionId ? 'warning' : 'info'
    });

    this.recheckConflicts();
    this.saveState();
    return newDecision;
  }

  public updateDecision(id: string, updates: Partial<Omit<Decision, 'id' | 'createdAt'>>): void {
    const index = this.state.decisions.findIndex((d) => d.id === id);
    if (index === -1) return;

    const existing = this.state.decisions[index];

    // Maintain immutability of createdAt
    this.state.decisions[index] = {
      ...existing,
      ...updates,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.logActivity({
      type: 'DECISION_UPDATED',
      title: `Decision Modified: ${this.state.decisions[index].title}`,
      description: `Status: ${this.state.decisions[index].status}`,
      projectId: this.state.decisions[index].projectId,
      projectName: this.state.decisions[index].projectName || 'General',
      relatedId: id,
      severity: 'info'
    });

    this.recheckConflicts();
    this.saveState();
  }

  /**
   * Multi-hop cycle prevention for decision supersession chains (A -> B -> C -> A)
   */
  public wouldFormDecisionCycle(newId: string, targetOldId: string): boolean {
    if (newId === targetOldId) return true;

    // Direction 1: starting from targetOldId, following predecessors
    const visited = new Set<string>();
    let currentId: string | undefined = targetOldId;
    while (currentId) {
      if (currentId === newId) return true;
      if (visited.has(currentId)) return true;
      visited.add(currentId);
      const dec = this.state.decisions.find((d) => d.id === currentId);
      currentId = dec?.supersedesDecisionId;
    }

    // Direction 2: starting from targetOldId, following successors
    visited.clear();
    currentId = targetOldId;
    while (currentId) {
      if (currentId === newId) return true;
      if (visited.has(currentId)) return true;
      visited.add(currentId);
      const dec = this.state.decisions.find((d) => d.id === currentId);
      currentId = dec?.supersededBy;
    }

    return false;
  }

  public supersedeDecision(
    oldDecisionId: string,
    newTitle: string,
    newRationale: string,
    changeExplanation: string
  ): Decision {
    const oldDecision = this.state.decisions.find((d) => d.id === oldDecisionId);

    const newDec = this.addDecision({
      title: newTitle,
      rationale: newRationale,
      projectId: oldDecision ? oldDecision.projectId : this.state.projects[0]?.id || 'PRJ-AI-RESEARCH',
      projectName: oldDecision?.projectName,
      status: 'CURRENT',
      supersedesDecisionId: oldDecisionId,
      sourceMemoryIds: oldDecision ? [...oldDecision.sourceMemoryIds] : [],
      changeExplanation,
      alternativesConsidered: oldDecision?.alternativesConsidered || []
    });

    return newDec;
  }

  /**
   * Reconstructs the complete causal lineage chain for a decision
   */
  public getDecisionLineage(decisionId: string): DecisionLineage | null {
    const decision = this.state.decisions.find((d) => d.id === decisionId);
    if (!decision) return null;

    // Collect predecessors (superseded by this decision)
    const predecessors: Decision[] = [];
    const visitedPred = new Set<string>();
    let currPredId = decision.supersedesDecisionId;

    while (currPredId && !visitedPred.has(currPredId)) {
      visitedPred.add(currPredId);
      const p = this.state.decisions.find((d) => d.id === currPredId);
      if (p) {
        predecessors.push(p);
        currPredId = p.supersedesDecisionId;
      } else {
        break;
      }
    }

    // Collect successors (superseding this decision)
    const successors: Decision[] = [];
    const visitedSucc = new Set<string>();
    let currSuccId = decision.supersededBy;

    while (currSuccId && !visitedSucc.has(currSuccId)) {
      visitedSucc.add(currSuccId);
      const s = this.state.decisions.find((d) => d.id === currSuccId);
      if (s) {
        successors.push(s);
        currSuccId = s.supersededBy;
      } else {
        break;
      }
    }

    // Source memories
    const sourceMemories = this.state.memories.filter((m) =>
      decision.sourceMemoryIds.includes(m.id)
    );

    // Dependent commitments
    const dependentCommitments = this.state.commitments.filter((c) =>
      decision.sourceMemoryIds.includes(c.sourceMemoryId || '') || c.projectId === decision.projectId
    );

    return {
      decision,
      predecessors,
      successors,
      sourceMemories,
      dependentCommitments
    };
  }

  /**
   * Reconstructs the causal lineage chain for a memory
   */
  public getMemoryLineage(memoryId: string): MemoryLineage | null {
    const memory = this.state.memories.find((m) => m.id === memoryId);
    if (!memory) return null;

    const predecessors: Memory[] = [];
    let currPredId = memory.supersedesMemoryId;
    const visitedPred = new Set<string>();

    while (currPredId && !visitedPred.has(currPredId)) {
      visitedPred.add(currPredId);
      const p = this.state.memories.find((m) => m.id === currPredId);
      if (p) {
        predecessors.push(p);
        currPredId = p.supersedesMemoryId;
      } else break;
    }

    const successors: Memory[] = [];
    let currSuccId = memory.supersededBy;
    const visitedSucc = new Set<string>();

    while (currSuccId && !visitedSucc.has(currSuccId)) {
      visitedSucc.add(currSuccId);
      const s = this.state.memories.find((m) => m.id === currSuccId);
      if (s) {
        successors.push(s);
        currSuccId = s.supersededBy;
      } else break;
    }

    const relatedMemories = this.state.memories.filter((m) =>
      memory.relatedMemoryIds.includes(m.id)
    );

    const dependentDecisions = this.state.decisions.filter((d) =>
      d.sourceMemoryIds.includes(memory.id)
    );

    return {
      memory,
      predecessors,
      successors,
      relatedMemories,
      dependentDecisions
    };
  }

  // --- PROJECT OPERATIONS ---
  public addProject(project: Omit<ProjectContext, 'id' | 'lastUpdated'>): ProjectContext {
    const id = `PRJ-${project.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 16)}`;
    const now = new Date();
    const newProject: ProjectContext = {
      ...project,
      id,
      lastUpdated: 'Just now',
      lastUpdatedISO: now.toISOString(),
      goals: project.goals || [],
      constraints: project.constraints || []
    };

    this.state.projects = [...this.state.projects, newProject];

    this.logActivity({
      type: 'CONTEXT_LINKED',
      title: `New Context Created: ${newProject.name}`,
      description: newProject.description,
      projectId: newProject.id,
      projectName: newProject.name,
      relatedId: newProject.id,
      severity: 'info'
    });

    this.saveState();
    return newProject;
  }

  public updateProject(id: string, updates: Partial<Omit<ProjectContext, 'id'>>): void {
    const index = this.state.projects.findIndex((p) => p.id === id);
    if (index === -1) return;

    const oldName = this.state.projects[index].name;
    const now = new Date();
    const updatedProject = {
      ...this.state.projects[index],
      ...updates,
      lastUpdated: 'Just now',
      lastUpdatedISO: now.toISOString()
    };

    this.state.projects[index] = updatedProject;

    // SYNC PROJECT NAME: Keep all associated records consistent!
    if (updates.name && updates.name !== oldName) {
      this.state.memories = this.state.memories.map((m) =>
        m.projectId === id ? { ...m, projectName: updates.name } : m
      );
      this.state.decisions = this.state.decisions.map((d) =>
        d.projectId === id ? { ...d, projectName: updates.name } : d
      );
      this.state.commitments = this.state.commitments.map((c) =>
        c.projectId === id ? { ...c, projectName: updates.name } : c
      );
    }

    this.logActivity({
      type: 'PROJECT_UPDATED',
      title: `Project Updated: ${updatedProject.name}`,
      description: `Health: ${updatedProject.health}%, Status: ${updatedProject.status}`,
      projectId: id,
      projectName: updatedProject.name,
      relatedId: id,
      severity: 'info'
    });

    this.saveState();
  }

  public deleteProject(id: string): void {
    const prj = this.state.projects.find((p) => p.id === id);
    if (!prj) return;

    this.state.projects = this.state.projects.filter((p) => p.id !== id);

    // Re-link or clean associated records
    this.state.memories = this.state.memories.map((m) =>
      m.projectId === id ? { ...m, projectName: `${m.projectName} (Archived Context)` } : m
    );

    this.saveState();
  }

  // --- COMMITMENT OPERATIONS ---
  public addCommitment(commitment: Omit<Commitment, 'id' | 'createdAt'>): Commitment {
    const project = this.state.projects.find((p) => p.id === commitment.projectId);
    const id = this.generateUniqueId('COM', this.state.commitments);
    const newCommitment: Commitment = {
      ...commitment,
      id,
      projectName: project ? project.name : 'General Context',
      createdAt: new Date().toISOString()
    };

    this.state.commitments = [newCommitment, ...this.state.commitments];

    this.logActivity({
      type: 'COMMITMENT_CREATED',
      title: `Commitment Logged: ${newCommitment.title}`,
      description: `Due ${newCommitment.dueDate} · Priority: ${newCommitment.priority}`,
      projectId: newCommitment.projectId,
      projectName: newCommitment.projectName || 'General',
      relatedId: newCommitment.id,
      severity: 'info'
    });

    this.recheckConflicts();
    this.saveState();
    return newCommitment;
  }

  public toggleCommitmentStatus(id: string): void {
    const commitment = this.state.commitments.find((c) => c.id === id);
    if (!commitment) return;

    if (commitment.status === 'COMPLETED') {
      commitment.status = 'OPEN';
      commitment.completedAt = undefined;
    } else {
      commitment.status = 'COMPLETED';
      commitment.completedAt = new Date().toISOString();

      this.logActivity({
        type: 'COMMITMENT_COMPLETED',
        title: `Commitment Completed: ${commitment.title}`,
        description: `Marked as done for ${commitment.projectName}`,
        projectId: commitment.projectId,
        projectName: commitment.projectName || 'General',
        relatedId: commitment.id,
        severity: 'success'
      });
    }

    this.recheckConflicts();
    this.saveState();
  }

  public updateCommitment(id: string, updates: Partial<Omit<Commitment, 'id' | 'createdAt'>>): void {
    const index = this.state.commitments.findIndex((c) => c.id === id);
    if (index === -1) return;

    const existing = this.state.commitments[index];
    this.state.commitments[index] = {
      ...existing,
      ...updates,
      createdAt: existing.createdAt
    };

    this.logActivity({
      type: 'COMMITMENT_UPDATED',
      title: `Commitment Updated: ${this.state.commitments[index].title}`,
      description: `Status: ${this.state.commitments[index].status}, Priority: ${this.state.commitments[index].priority}`,
      projectId: this.state.commitments[index].projectId,
      projectName: this.state.commitments[index].projectName || 'General',
      relatedId: id,
      severity: 'info'
    });

    this.recheckConflicts();
    this.saveState();
  }

  public deleteCommitment(id: string): void {
    this.state.commitments = this.state.commitments.filter((c) => c.id !== id);
    this.recheckConflicts();
    this.saveState();
  }

  // --- CONFLICT RESOLUTION ---
  public recheckConflicts(): void {
    this.state.conflicts = ConflictDetector.detectConflicts(
      this.state.memories,
      this.state.decisions,
      this.state.conflicts,
      this.state.commitments,
      this.state.projects
    );
  }

  public resolveConflict(conflictId: string, resolutionNotes: string): boolean {
    const conflict = this.state.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return false;

    conflict.status = 'RESOLVED';
    conflict.resolutionNotes = resolutionNotes;

    this.logActivity({
      type: 'CONFLICT_RESOLVED',
      title: `Conflict Resolved: ${conflict.title}`,
      description: resolutionNotes,
      projectId: conflict.projectId,
      projectName: conflict.projectName || 'General',
      relatedId: conflict.id,
      severity: 'success'
    });

    this.saveState();
    return true;
  }

  public dismissConflict(conflictId: string, dismissalNotes?: string): boolean {
    const conflict = this.state.conflicts.find((c) => c.id === conflictId);
    if (!conflict) return false;

    conflict.status = 'RESOLVED';
    conflict.resolutionNotes = dismissalNotes || 'Dismissed by operator after manual inspection.';

    this.logActivity({
      type: 'CONFLICT_DISMISSED',
      title: `Conflict Dismissed: ${conflict.title}`,
      description: conflict.resolutionNotes,
      projectId: conflict.projectId,
      projectName: conflict.projectName || 'General',
      relatedId: conflict.id,
      severity: 'info'
    });

    this.saveState();
    return true;
  }

  // --- DATA MANAGEMENT ---
  public resetToDemoData(): void {
    this.state = this.sanitizeState({
      version: 2,
      projects: INITIAL_PROJECTS,
      memories: INITIAL_MEMORIES,
      decisions: INITIAL_DECISIONS,
      commitments: INITIAL_COMMITMENTS,
      activities: INITIAL_ACTIVITIES,
      conflicts: INITIAL_CONFLICTS
    });
    this.saveState();
  }

  public exportDataJson(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public importDataJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (
        Array.isArray(parsed.projects) &&
        Array.isArray(parsed.memories) &&
        Array.isArray(parsed.decisions) &&
        Array.isArray(parsed.commitments)
      ) {
        this.state = this.sanitizeState(parsed);
        this.saveState();
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
    }
    return false;
  }
}

// Global Singleton
export const dataStore = new DataStoreManager();

// React Hook
export function useContextOSStore(testClock?: Date) {
  const [state, setState] = useState<AppDataState>(() => dataStore.getState());

  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      setState({ ...dataStore.getState() });
    });
    return () => unsubscribe();
  }, []);

  const now = testClock || new Date();
  const startOfToday = getStartOfDay(now);

  // Derive metrics dynamically from actual store arrays
  const totalMemories = state.memories.length;
  const activeProjectsCount = state.projects.filter((p) => p.status === 'ACTIVE').length;
  const recordedDecisions = state.decisions.length;
  const openCommitmentsCount = state.commitments.filter(
    (c) => c.status !== 'COMPLETED' && c.status !== 'CANCELLED'
  ).length;

  const overdueCommitmentsCount = state.commitments.filter((c) => {
    if (c.status === 'COMPLETED' || c.status === 'CANCELLED') return false;
    const due = new Date(c.dueDate);
    return due < startOfToday;
  }).length;

  const totalUpdates = state.activities.length;
  const unresolvedConflicts = state.conflicts.filter((c) => c.status === 'UNRESOLVED');

  return {
    state,
    metrics: {
      totalMemories,
      activeProjectsCount,
      recordedDecisions,
      openCommitmentsCount,
      overdueCommitmentsCount,
      totalUpdates,
      unresolvedConflictsCount: unresolvedConflicts.length
    },
    actions: {
      addMemory: (m: Parameters<typeof dataStore.addMemory>[0]) => dataStore.addMemory(m),
      updateMemory: (id: string, updates: Parameters<typeof dataStore.updateMemory>[1]) => dataStore.updateMemory(id, updates),
      deleteMemory: (id: string) => dataStore.deleteMemory(id),
      supersedeMemory: (tId: string, sId: string, reason?: string) => dataStore.supersedeMemory(tId, sId, reason),

      addDecision: (d: Parameters<typeof dataStore.addDecision>[0]) => dataStore.addDecision(d),
      updateDecision: (id: string, updates: Parameters<typeof dataStore.updateDecision>[1]) => dataStore.updateDecision(id, updates),
      supersedeDecision: (oldId: string, t: string, r: string, exp: string) => dataStore.supersedeDecision(oldId, t, r, exp),
      getDecisionLineage: (id: string) => dataStore.getDecisionLineage(id),
      getMemoryLineage: (id: string) => dataStore.getMemoryLineage(id),

      addProject: (p: Parameters<typeof dataStore.addProject>[0]) => dataStore.addProject(p),
      updateProject: (id: string, updates: Parameters<typeof dataStore.updateProject>[1]) => dataStore.updateProject(id, updates),
      deleteProject: (id: string) => dataStore.deleteProject(id),

      addCommitment: (c: Parameters<typeof dataStore.addCommitment>[0]) => dataStore.addCommitment(c),
      toggleCommitmentStatus: (id: string) => dataStore.toggleCommitmentStatus(id),
      updateCommitment: (id: string, updates: Parameters<typeof dataStore.updateCommitment>[1]) => dataStore.updateCommitment(id, updates),
      deleteCommitment: (id: string) => dataStore.deleteCommitment(id),

      resolveConflict: (id: string, notes: string) => dataStore.resolveConflict(id, notes),
      dismissConflict: (id: string, notes?: string) => dataStore.dismissConflict(id, notes),
      recheckConflicts: () => dataStore.recheckConflicts(),
      resetToDemoData: () => dataStore.resetToDemoData(),
      exportDataJson: () => dataStore.exportDataJson(),
      importDataJson: (json: string) => dataStore.importDataJson(json)
    }
  };
}
