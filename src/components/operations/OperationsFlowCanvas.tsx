'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  Ship,
  Package,
  MapPin,
  Plus,
  Trash2,
  X,
  Sparkles,
  RefreshCw,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Layers,
  ArrowRight,
  Eye,
  Car,
  Key,
  FileCheck,
  AlertCircle,
  Scissors,
  CheckCircle2,
  GripVertical,
  Link as LinkIcon,
  Unlink,
  Search,
  Filter,
  CheckSquare,
  Square,
  Zap,
  Compass,
  Workflow,
  Target,
  ExternalLink,
} from 'lucide-react';
import { Button, toast, Modal } from '@/components/design-system';
import EntityWireframeModal from './EntityWireframeModal';

export interface FlowShipment {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  lotNumber: string | null;
  status: string;
  destinationPort?: string | null;
  auctionName?: string | null;
  purchaseLocation?: string | null;
  hasKey?: boolean | null;
  hasTitle?: boolean | null;
  createdAt?: string;
  dispatchId?: string | null;
  containerId?: string | null;
  user?: { id: string; name: string | null; email: string };
}

export interface FlowDispatch {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  estimatedArrival: string | null;
  company: { id: string; name: string; code: string | null };
  shipments: {
    id: string;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
    status: string;
  }[];
}

export interface FlowContainer {
  id: string;
  containerNumber: string;
  status: string;
  vesselName: string | null;
  destinationPort: string | null;
  maxCapacity: number;
  currentCount: number;
  company?: { id: string; name: string; code: string | null } | null;
  shipments: {
    id: string;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
    status: string;
  }[];
}

export type NodeType = 'shipment' | 'dispatch' | 'container' | 'port';

export interface CanvasNode {
  id: string;
  type: NodeType;
  entityId: string;
  x: number;
  y: number;
  title?: string;
}

interface WireConnection {
  id: string;
  sourceNodeId: string;
  sourceType: NodeType;
  targetNodeId: string;
  targetType: NodeType;
  shipmentId?: string;
}

interface OperationsFlowCanvasProps {
  shipments: FlowShipment[];
  dispatches: FlowDispatch[];
  containers: FlowContainer[];
  onAssignToDispatch: (dispatchId: string, shipmentIds: string[]) => Promise<void>;
  onUnassignFromDispatch: (shipmentId: string) => Promise<void>;
  onAssignToContainer: (containerId: string, shipmentIds: string[]) => Promise<void>;
  onUnassignFromContainer: (shipmentId: string) => Promise<void>;
  onInspectShipment?: (shipment: FlowShipment) => void;
  onRefresh?: () => void;
  onOpenCreateDispatch?: () => void;
  onOpenCreateContainer?: () => void;
}

export default function OperationsFlowCanvas({
  shipments,
  dispatches,
  containers,
  onAssignToDispatch,
  onUnassignFromDispatch,
  onAssignToContainer,
  onUnassignFromContainer,
  onInspectShipment,
  onRefresh,
  onOpenCreateDispatch,
  onOpenCreateContainer,
}: OperationsFlowCanvasProps) {
  // Canvas Viewport State
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  
  // Dragging Nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Wiring In-Progress State
  const [wiringSource, setWiringSource] = useState<{
    nodeId: string;
    type: NodeType;
    entityId: string;
    socketPos: { x: number; y: number };
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState<string | null>(null);

  // Focus Wireframe on Specific Entity
  const [focusedWireframeEntity, setFocusedWireframeEntity] = useState<{
    type: NodeType;
    id: string;
    title: string;
  } | null>(null);

  // Wireframe Detail Modal State
  const [wireframeModalState, setWireframeModalState] = useState<{
    open: boolean;
    type: 'shipment' | 'container' | 'dispatch' | 'transit';
    id: string;
  }>({
    open: false,
    type: 'shipment',
    id: '',
  });

  // Add Item Modals & Wireframe Picker
  const [showAddModal, setShowAddModal] = useState<NodeType | null>(null);
  const [showWireframePicker, setShowWireframePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto layout on initial load if no nodes exist
  const initAutoLayout = useCallback(() => {
    const newNodes: CanvasNode[] = [];
    const colSpacing = 340;
    const rowSpacing = 160;

    // Pick up to 6 unassigned / active shipments
    const activeShipments = shipments.slice(0, 6);
    activeShipments.forEach((s, idx) => {
      newNodes.push({
        id: `node-shipment-${s.id}`,
        type: 'shipment',
        entityId: s.id,
        x: 40,
        y: 40 + idx * rowSpacing,
      });
    });

    // Pick active dispatches
    const activeDispatches = dispatches.slice(0, 4);
    activeDispatches.forEach((d, idx) => {
      newNodes.push({
        id: `node-dispatch-${d.id}`,
        type: 'dispatch',
        entityId: d.id,
        x: 40 + colSpacing,
        y: 40 + idx * (rowSpacing + 40),
      });
    });

    // Pick active containers
    const activeContainers = containers.slice(0, 4);
    activeContainers.forEach((c, idx) => {
      newNodes.push({
        id: `node-container-${c.id}`,
        type: 'container',
        entityId: c.id,
        x: 40 + colSpacing * 2,
        y: 40 + idx * (rowSpacing + 50),
      });
    });

    // Ports
    const uniquePorts = Array.from(
      new Set(
        [
          ...containers.map((c) => c.destinationPort),
          ...shipments.map((s) => s.destinationPort),
        ].filter(Boolean)
      )
    ).slice(0, 3) as string[];

    uniquePorts.forEach((port, idx) => {
      newNodes.push({
        id: `node-port-${port.replace(/\s+/g, '-').toLowerCase()}`,
        type: 'port',
        entityId: port,
        title: port,
        x: 40 + colSpacing * 3,
        y: 60 + idx * (rowSpacing + 20),
      });
    });

    setNodes(newNodes);
    setFocusedWireframeEntity(null);
    toast.success('Auto-arranged workflow workspace');
  }, [shipments, dispatches, containers]);

  // Initial layout if canvas is empty
  useEffect(() => {
    if (nodes.length === 0 && (shipments.length > 0 || dispatches.length > 0 || containers.length > 0)) {
      initAutoLayout();
    }
  }, [shipments.length, dispatches.length, containers.length, nodes.length, initAutoLayout]);

  // Determine connected nodes for Focus Wireframe Mode
  const focusedNodeIdSet = useMemo(() => {
    if (!focusedWireframeEntity) return null;
    const set = new Set<string>();

    const { type, id } = focusedWireframeEntity;

    if (type === 'shipment') {
      const s = shipments.find((item) => item.id === id);
      if (s) {
        set.add(`node-shipment-${s.id}`);
        if (s.dispatchId) set.add(`node-dispatch-${s.dispatchId}`);
        if (s.containerId) set.add(`node-container-${s.containerId}`);
        if (s.destinationPort) {
          set.add(`node-port-${s.destinationPort.replace(/\s+/g, '-').toLowerCase()}`);
        }
      }
    } else if (type === 'container') {
      const c = containers.find((item) => item.id === id);
      if (c) {
        set.add(`node-container-${c.id}`);
        shipments.filter((s) => s.containerId === c.id).forEach((s) => {
          set.add(`node-shipment-${s.id}`);
          if (s.dispatchId) set.add(`node-dispatch-${s.dispatchId}`);
        });
        if (c.destinationPort) {
          set.add(`node-port-${c.destinationPort.replace(/\s+/g, '-').toLowerCase()}`);
        }
      }
    } else if (type === 'dispatch') {
      const d = dispatches.find((item) => item.id === id);
      if (d) {
        set.add(`node-dispatch-${d.id}`);
        shipments.filter((s) => s.dispatchId === d.id).forEach((s) => {
          set.add(`node-shipment-${s.id}`);
          if (s.containerId) set.add(`node-container-${s.containerId}`);
        });
      }
    } else if (type === 'port') {
      set.add(`node-port-${id.replace(/\s+/g, '-').toLowerCase()}`);
      containers.filter((c) => c.destinationPort === id).forEach((c) => {
        set.add(`node-container-${c.id}`);
      });
      shipments.filter((s) => s.destinationPort === id).forEach((s) => {
        set.add(`node-shipment-${s.id}`);
      });
    }

    return set;
  }, [focusedWireframeEntity, shipments, containers, dispatches]);

  // Compute Active Wires based on real relational state
  const computedWires = useMemo(() => {
    const wires: WireConnection[] = [];

    // Map entity to node ID
    const entityToNodeMap = new Map<string, CanvasNode>();
    nodes.forEach((n) => {
      entityToNodeMap.set(`${n.type}:${n.entityId}`, n);
    });

    // 1. Shipment -> Dispatch Wires
    shipments.forEach((s) => {
      if (s.dispatchId) {
        const sourceNode = entityToNodeMap.get(`shipment:${s.id}`);
        const targetNode = entityToNodeMap.get(`dispatch:${s.dispatchId}`);
        if (sourceNode && targetNode) {
          wires.push({
            id: `wire-${s.id}-dispatch-${s.dispatchId}`,
            sourceNodeId: sourceNode.id,
            sourceType: 'shipment',
            targetNodeId: targetNode.id,
            targetType: 'dispatch',
            shipmentId: s.id,
          });
        }
      }

      // 2. Shipment -> Container Wires (Direct)
      if (s.containerId) {
        const sourceNode = entityToNodeMap.get(`shipment:${s.id}`);
        const targetNode = entityToNodeMap.get(`container:${s.containerId}`);
        if (sourceNode && targetNode) {
          wires.push({
            id: `wire-${s.id}-container-${s.containerId}`,
            sourceNodeId: sourceNode.id,
            sourceType: 'shipment',
            targetNodeId: targetNode.id,
            targetType: 'container',
            shipmentId: s.id,
          });
        }
      }
    });

    // 3. Container -> Port Wires
    containers.forEach((c) => {
      if (c.destinationPort) {
        const sourceNode = entityToNodeMap.get(`container:${c.id}`);
        const targetNode = entityToNodeMap.get(`port:${c.destinationPort}`);
        if (sourceNode && targetNode) {
          wires.push({
            id: `wire-container-${c.id}-port-${c.destinationPort}`,
            sourceNodeId: sourceNode.id,
            sourceType: 'container',
            targetNodeId: targetNode.id,
            targetType: 'port',
          });
        }
      }
    });

    return wires;
  }, [nodes, shipments, containers]);

  // Track Node Sockets Positions
  const getNodeSocketPos = useCallback(
    (nodeId: string, side: 'input' | 'output') => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return { x: 0, y: 0 };

      const el = nodeRefs.current.get(nodeId);
      const width = el?.offsetWidth || 280;
      const height = el?.offsetHeight || 140;

      if (side === 'input') {
        return { x: node.x, y: node.y + height / 2 };
      } else {
        return { x: node.x + width, y: node.y + height / 2 };
      }
    },
    [nodes]
  );

  // Mouse move handler for canvas & wiring
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setMousePos({ x, y });

    // Dragging a node
    if (draggingNodeId) {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === draggingNodeId) {
            return {
              ...n,
              x: Math.max(10, Math.round(x - dragOffset.x)),
              y: Math.max(10, Math.round(y - dragOffset.y)),
            };
          }
          return n;
        })
      );
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
  };

  // Node Drag Start
  const startDragNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    setDragOffset({
      x: mouseX - node.x,
      y: mouseY - node.y,
    });
    setDraggingNodeId(nodeId);
  };

  // Wiring Sockets Handlers
  const handleStartWiring = (node: CanvasNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const socketPos = getNodeSocketPos(node.id, 'output');
    setWiringSource({
      nodeId: node.id,
      type: node.type,
      entityId: node.entityId,
      socketPos,
    });
    toast.info(`Wiring mode active: Drag or click a target node to connect`);
  };

  const handleCompleteWiring = async (targetNode: CanvasNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wiringSource) return;

    if (wiringSource.nodeId === targetNode.id) {
      setWiringSource(null);
      return;
    }

    try {
      // 1. Shipment -> Dispatch
      if (wiringSource.type === 'shipment' && targetNode.type === 'dispatch') {
        await onAssignToDispatch(targetNode.entityId, [wiringSource.entityId]);
        toast.success(`Connected vehicle to dispatch lane!`);
      }
      // 2. Shipment -> Container
      else if (wiringSource.type === 'shipment' && targetNode.type === 'container') {
        await onAssignToContainer(targetNode.entityId, [wiringSource.entityId]);
        toast.success(`Stowed vehicle into container!`);
      }
      // 3. Dispatch -> Container
      else if (wiringSource.type === 'dispatch' && targetNode.type === 'container') {
        const dispatch = dispatches.find((d) => d.id === wiringSource.entityId);
        if (dispatch && dispatch.shipments.length > 0) {
          const ids = dispatch.shipments.map((s) => s.id);
          await onAssignToContainer(targetNode.entityId, ids);
          toast.success(`Stowed all ${ids.length} vehicles from dispatch into container!`);
        } else {
          toast.error(`Dispatch has no assigned vehicles to stow`);
        }
      } else {
        toast.error(`Cannot connect ${wiringSource.type} to ${targetNode.type}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Connection failed');
    } finally {
      setWiringSource(null);
      setHoveredTargetNodeId(null);
    }
  };

  const handleCancelWiring = () => {
    if (wiringSource) {
      setWiringSource(null);
      setHoveredTargetNodeId(null);
    }
  };

  // HTML5 Drag and drop handlers on Nodes
  const handleDragStartCard = (e: React.DragEvent, shipmentId: string) => {
    e.dataTransfer.setData('text/plain', shipmentId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnNode = async (e: React.DragEvent, targetNode: CanvasNode) => {
    e.preventDefault();
    const shipmentId = e.dataTransfer.getData('text/plain');
    if (!shipmentId) return;

    if (targetNode.type === 'dispatch') {
      await onAssignToDispatch(targetNode.entityId, [shipmentId]);
    } else if (targetNode.type === 'container') {
      await onAssignToContainer(targetNode.entityId, [shipmentId]);
    }
  };

  // Remove node from canvas (Clean workspace)
  const removeNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    toast.info('Removed node from canvas');
  };

  // Clear All Nodes (Clean Slate)
  const handleClearCanvas = () => {
    setNodes([]);
    setFocusedWireframeEntity(null);
    toast.info('Canvas cleared. Click "+ Add to Flow" to build your custom workspace.');
  };

  // Focus Wireframe on specific entity
  const handleFocusEntityWireframe = (type: NodeType, id: string, title: string) => {
    setFocusedWireframeEntity({ type, id, title });

    // If matching nodes aren't already on canvas, add them automatically
    const existingEntityIds = new Set(nodes.map((n) => `${n.type}:${n.entityId}`));
    const nodesToAdd: CanvasNode[] = [];

    if (!existingEntityIds.has(`${type}:${id}`)) {
      nodesToAdd.push({
        id: `node-${type}-${id}`,
        type,
        entityId: id,
        title,
        x: 80,
        y: 80,
      });
    }

    if (type === 'shipment') {
      const s = shipments.find((item) => item.id === id);
      if (s?.dispatchId && !existingEntityIds.has(`dispatch:${s.dispatchId}`)) {
        nodesToAdd.push({
          id: `node-dispatch-${s.dispatchId}`,
          type: 'dispatch',
          entityId: s.dispatchId,
          x: 420,
          y: 80,
        });
      }
      if (s?.containerId && !existingEntityIds.has(`container:${s.containerId}`)) {
        nodesToAdd.push({
          id: `node-container-${s.containerId}`,
          type: 'container',
          entityId: s.containerId,
          x: 760,
          y: 80,
        });
      }
    }

    if (nodesToAdd.length > 0) {
      setNodes((prev) => [...prev, ...nodesToAdd]);
    }

    toast.success(`Focused wireframe for: ${title}`);
  };

  // Add elements from picker
  const handleAddSelectedToCanvas = (type: NodeType) => {
    if (selectedToAdd.length === 0) {
      setShowAddModal(null);
      return;
    }

    const colX =
      type === 'shipment' ? 40 : type === 'dispatch' ? 380 : type === 'container' ? 720 : 1060;

    const existingCount = nodes.filter((n) => n.type === type).length;

    const newCanvasNodes: CanvasNode[] = selectedToAdd.map((id, idx) => {
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const randomOffset = (randomArray[0] % 20000) / 1000 - 10;

      return {
        id: `node-${type}-${id}-${crypto.randomUUID()}-${idx}`,
        type,
        entityId: id,
        x: colX + randomOffset,
        y: 40 + (existingCount + idx) * 160,
      };
    });

    setNodes((prev) => [...prev, ...newCanvasNodes]);
    setSelectedToAdd([]);
    setShowAddModal(null);
    toast.success(`Added ${newCanvasNodes.length} ${type}(s) to canvas`);
  };

  // Helper to render SVG Bezier Path
  const renderWirePath = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    color: string = '#EAB308',
    isDashed = false,
    wireId?: string,
    shipmentId?: string,
    isHighlighted = false
  ) => {
    const dx = Math.abs(end.x - start.x) * 0.5;
    const cp1x = start.x + Math.max(dx, 60);
    const cp1y = start.y;
    const cp2x = end.x - Math.max(dx, 60);
    const cp2y = end.y;

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    const d = `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;

    return (
      <g key={wireId || `${start.x}-${start.y}-${end.x}-${end.y}`} className="group/wire">
        {/* Outer Glow */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={isHighlighted ? '10' : '6'}
          strokeOpacity={isHighlighted ? '0.35' : '0.15'}
          className="transition-all duration-300 group-hover/wire:stroke-opacity-50"
        />
        {/* Core Line */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={isHighlighted ? '4' : '2.5'}
          strokeDasharray={isDashed ? '6 4' : 'none'}
          className={isDashed ? 'animate-[dash_1s_linear_infinite]' : ''}
        />
        {/* Animated pulse dot */}
        {!isDashed && (
          <circle r={isHighlighted ? '4.5' : '3.5'} fill={color} className="animate-pulse">
            <animateMotion path={d} dur={isHighlighted ? '2s' : '3s'} repeatCount="indefinite" />
          </circle>
        )}

        {/* Quick Unwire Button on Wire Midpoint */}
        {shipmentId && (
          <g
            className="opacity-0 group-hover/wire:opacity-100 transition-opacity cursor-pointer"
            onClick={async (e) => {
              e.stopPropagation();
              const s = shipments.find((item) => item.id === shipmentId);
              if (s?.dispatchId) {
                await onUnassignFromDispatch(shipmentId);
                toast.info('Disconnected vehicle from dispatch');
              } else if (s?.containerId) {
                await onUnassignFromContainer(shipmentId);
                toast.info('Disconnected vehicle from container');
              }
            }}
          >
            <circle cx={midX} cy={midY} r="12" fill="#1E293B" stroke={color} strokeWidth="2" />
            <text
              x={midX}
              y={midY + 3.5}
              textAnchor="middle"
              fill="#EF4444"
              fontSize="10"
              fontWeight="bold"
            >
              ✕
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Studio Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 mr-2">
            <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
            Visual Workflow Studio:
          </span>

          {/* Add to Canvas Buttons */}
          <Button
            size="sm"
            variant="outline"
            icon={<Package className="w-3.5 h-3.5 text-[var(--accent-gold)]" />}
            onClick={() => {
              setSearchQuery('');
              setSelectedToAdd([]);
              setShowAddModal('shipment');
            }}
          >
            + Add Shipment
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<Truck className="w-3.5 h-3.5 text-blue-500" />}
            onClick={() => {
              setSearchQuery('');
              setSelectedToAdd([]);
              setShowAddModal('dispatch');
            }}
          >
            + Add Dispatch
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<Ship className="w-3.5 h-3.5 text-indigo-500" />}
            onClick={() => {
              setSearchQuery('');
              setSelectedToAdd([]);
              setShowAddModal('container');
            }}
          >
            + Add Container
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<MapPin className="w-3.5 h-3.5 text-emerald-500" />}
            onClick={() => {
              setSearchQuery('');
              setSelectedToAdd([]);
              setShowAddModal('port');
            }}
          >
            + Add Port
          </Button>

          {/* Wireframe Inspector Quick Trigger */}
          <Button
            size="sm"
            variant="primary"
            icon={<Layers className="w-3.5 h-3.5" />}
            onClick={() => {
              setSearchQuery('');
              setShowWireframePicker(true);
            }}
          >
            Inspect Specific Wireframe
          </Button>
        </div>

        {/* Canvas Controls: Zoom & Arrange */}
        <div className="flex items-center gap-2">
          {wiringSource && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold animate-pulse">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Wiring: Click target node socket</span>
              <button
                type="button"
                onClick={handleCancelWiring}
                className="ml-1 p-0.5 rounded hover:bg-amber-500/20 text-amber-600"
              >
                ✕
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-[var(--text-secondary)] min-w-[40px] text-center font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--panel)] text-[11px] font-bold text-[var(--text-secondary)]"
            title="Reset Zoom"
          >
            100%
          </button>

          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={initAutoLayout}
            title="Auto-arrange nodes in clean workflow lanes"
          >
            Auto-Flow
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<Trash2 className="w-3.5 h-3.5 text-[var(--error)]" />}
            onClick={handleClearCanvas}
            title="Clear all nodes to build your own view"
          >
            Clear Board
          </Button>
        </div>
      </div>

      {/* Focus Wireframe Active Banner */}
      {focusedWireframeEntity && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
            <div>
              <span className="font-bold text-[var(--text-primary)]">
                Focused Wireframe Lineage:
              </span>{' '}
              <strong className="text-indigo-400 font-mono">
                {focusedWireframeEntity.type.toUpperCase()}: {focusedWireframeEntity.title}
              </strong>{' '}
              <span className="text-[var(--text-secondary)]">
                ({focusedNodeIdSet ? focusedNodeIdSet.size : 1} connected nodes highlighted)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setWireframeModalState({
                  open: true,
                  type: focusedWireframeEntity.type as any,
                  id: focusedWireframeEntity.id,
                })
              }
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 shadow-sm transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Blueprint & Transit</span>
            </button>
            <button
              type="button"
              onClick={() => setFocusedWireframeEntity(null)}
              className="px-2.5 py-1 rounded-lg bg-[var(--panel)] border hover:bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold transition-colors"
            >
              Reset (Show Full Canvas)
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Flow Canvas */}
      <div
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCancelWiring}
        className="relative w-full h-[700px] rounded-2xl border border-[var(--border)] bg-[var(--background)] overflow-hidden shadow-inner select-none cursor-default"
        style={{
          backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        }}
      >
        {/* Canvas Transformation Container */}
        <div
          className="absolute inset-0 origin-top-left transition-transform duration-75"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* SVG Connection Layer */}
          <svg className="absolute inset-0 w-[4000px] h-[4000px] pointer-events-none z-10">
            <defs>
              <linearGradient id="grad-dispatch" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient id="grad-container" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient id="grad-port" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>

            {/* Render Established DB Relational Wires */}
            {computedWires.map((wire) => {
              const start = getNodeSocketPos(wire.sourceNodeId, 'output');
              const end = getNodeSocketPos(wire.targetNodeId, 'input');
              let color = 'url(#grad-dispatch)';
              if (wire.targetType === 'container') color = 'url(#grad-container)';
              if (wire.targetType === 'port') color = 'url(#grad-port)';

              const isHighlighted =
                Boolean(focusedNodeIdSet) &&
                focusedNodeIdSet!.has(wire.sourceNodeId) &&
                focusedNodeIdSet!.has(wire.targetNodeId);

              return renderWirePath(
                start,
                end,
                color,
                false,
                wire.id,
                wire.shipmentId,
                isHighlighted
              );
            })}

            {/* Render In-Progress Wiring Line */}
            {wiringSource &&
              renderWirePath(
                wiringSource.socketPos,
                mousePos,
                wiringSource.type === 'shipment' ? '#F59E0B' : '#6366F1',
                true,
                'active-wiring-line'
              )}
          </svg>

          {/* Render Nodes */}
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none">
              <div className="p-4 rounded-3xl bg-[var(--panel)] border border-[var(--border)] max-w-md shadow-xl pointer-events-auto">
                <Sparkles className="w-10 h-10 mx-auto text-[var(--accent-gold)] mb-3" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Clean Canvas Workspace</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Start by adding shipments, dispatches, or containers from the top toolbar, then drag & drop or wire them together!
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button size="sm" variant="primary" onClick={initAutoLayout}>
                    Load Active Flow
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            nodes.map((node) => {
              const isHovered = hoveredTargetNodeId === node.id;
              const isWiringSrc = wiringSource?.nodeId === node.id;
              const isFocused = !focusedNodeIdSet || focusedNodeIdSet.has(node.id);

              return (
                <div
                  key={node.id}
                  ref={(el) => {
                    if (el) nodeRefs.current.set(node.id, el);
                    else nodeRefs.current.delete(node.id);
                  }}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoveredTargetNodeId(node.id);
                  }}
                  onDragLeave={() => {
                    if (hoveredTargetNodeId === node.id) setHoveredTargetNodeId(null);
                  }}
                  onDrop={(e) => {
                    setHoveredTargetNodeId(null);
                    handleDropOnNode(e, node);
                  }}
                  className={`absolute w-72 rounded-2xl border bg-[var(--panel)] shadow-lg transition-all z-20 ${
                    !isFocused
                      ? 'opacity-25 grayscale hover:grayscale-0 hover:opacity-100'
                      : isHovered
                      ? 'border-[var(--accent-gold)] ring-4 ring-[var(--accent-gold)]/30 scale-105'
                      : isWiringSrc
                      ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]'
                      : focusedNodeIdSet?.has(node.id)
                      ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl'
                      : 'border-[var(--border)] hover:border-[var(--accent-gold)]/60'
                  }`}
                >
                  {/* Left Socket (Input) */}
                  {node.type !== 'shipment' && (
                    <div
                      onClick={(e) => handleCompleteWiring(node, e)}
                      className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-125 z-30 ${
                        wiringSource && wiringSource.nodeId !== node.id
                          ? 'bg-[var(--accent-gold)] border-white animate-bounce ring-4 ring-[var(--accent-gold)]/40'
                          : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--accent-gold)]'
                      }`}
                      title="Input Socket: Connect wire here"
                    >
                      <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                    </div>
                  )}

                  {/* Right Socket (Output) */}
                  {node.type !== 'port' && (
                    <div
                      onClick={(e) => handleStartWiring(node, e)}
                      className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-125 z-30 ${
                        isWiringSrc
                          ? 'bg-[var(--accent-gold)] border-white ring-4 ring-[var(--accent-gold)]/40'
                          : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20'
                      }`}
                      title="Output Socket: Click to draw wire"
                    >
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-gold)]" />
                    </div>
                  )}

                  {/* Node Header & Drag Bar */}
                  <div
                    onMouseDown={(e) => startDragNode(node.id, e)}
                    className="p-3 border-b border-[var(--border)] flex items-center justify-between cursor-move bg-[var(--background)]/50 rounded-t-2xl"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      {node.type === 'shipment' && <Package className="w-4 h-4 text-[var(--accent-gold)]" />}
                      {node.type === 'dispatch' && <Truck className="w-4 h-4 text-blue-500" />}
                      {node.type === 'container' && <Ship className="w-4 h-4 text-indigo-500" />}
                      {node.type === 'port' && <MapPin className="w-4 h-4 text-emerald-500" />}
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        {node.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Focus Wireframe Button on Node */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          let title = node.entityId;
                          if (node.type === 'shipment') {
                            const s = shipments.find((item) => item.id === node.entityId);
                            title = `${s?.vehicleYear || ''} ${s?.vehicleMake || ''} (${s?.vehicleVIN?.slice(-6) || ''})`;
                          } else if (node.type === 'dispatch') {
                            const d = dispatches.find((item) => item.id === node.entityId);
                            title = d?.referenceNumber || node.entityId;
                          } else if (node.type === 'container') {
                            const c = containers.find((item) => item.id === node.entityId);
                            title = c?.containerNumber || node.entityId;
                          }
                          handleFocusEntityWireframe(node.type, node.entityId, title);
                        }}
                        className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-[var(--background)] transition-colors"
                        title="Focus and isolate wireframe lineage"
                      >
                        <Target className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeNode(node.id)}
                        className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--background)] transition-colors"
                        title="Remove node from canvas"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Node Content Body */}
                  <div className="p-3">
                    {/* 1. Shipment Node Body */}
                    {node.type === 'shipment' && (() => {
                      const s = shipments.find((item) => item.id === node.entityId);
                      if (!s) return <p className="text-xs text-[var(--text-secondary)]">Vehicle not found</p>;

                      return (
                        <div
                          draggable
                          onDragStart={(e) => handleDragStartCard(e, s.id)}
                          className="space-y-2 cursor-grab active:cursor-grabbing"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {s.vehicleYear || ''} {s.vehicleMake || 'Vehicle'} {s.vehicleModel || ''}
                            </h4>
                            <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5 truncate">
                              VIN: {s.vehicleVIN || 'N/A'} {s.lotNumber ? `• Lot #${s.lotNumber}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {s.hasTitle ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 flex items-center gap-0.5">
                                <FileCheck className="w-2.5 h-2.5" /> Title OK
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" /> Title Pending
                              </span>
                            )}

                            {s.destinationPort && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                {s.destinationPort.split('(')[0]}
                              </span>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWireframeModalState({
                                  open: true,
                                  type: 'shipment',
                                  id: s.id,
                                });
                              }}
                              className="text-indigo-400 font-bold hover:underline flex items-center gap-1"
                            >
                              <Layers className="w-3 h-3" />
                              <span>Wireframe</span>
                            </button>

                            {onInspectShipment && (
                              <button
                                type="button"
                                onClick={() => onInspectShipment(s)}
                                className="text-[var(--accent-gold)] font-bold hover:underline flex items-center gap-1"
                              >
                                <Car className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Dispatch Node Body */}
                    {node.type === 'dispatch' && (() => {
                      const d = dispatches.find((item) => item.id === node.entityId);
                      if (!d) return <p className="text-xs text-[var(--text-secondary)]">Dispatch not found</p>;

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                              {d.referenceNumber}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-500">
                              {d.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            Carrier: <strong className="text-[var(--text-primary)]">{d.company?.name || 'Carrier'}</strong>
                          </p>

                          <div className="p-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[10px] flex items-center justify-between">
                            <span className="truncate">{d.origin}</span>
                            <ArrowRight className="w-3 h-3 text-[var(--text-secondary)] mx-1 shrink-0" />
                            <span className="truncate font-semibold text-[var(--text-primary)]">{d.destination}</span>
                          </div>

                          {/* Assigned Vehicles in Dispatch */}
                          <div className="pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                Vehicles ({d.shipments?.length || 0})
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWireframeModalState({
                                    open: true,
                                    type: 'dispatch',
                                    id: d.id,
                                  });
                                }}
                                className="text-[10px] text-blue-400 font-bold hover:underline flex items-center gap-0.5"
                              >
                                <Layers className="w-3 h-3" />
                                <span>Wireframe</span>
                              </button>
                            </div>

                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {d.shipments && d.shipments.length > 0 ? (
                                d.shipments.map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-1.5 rounded bg-[var(--background)] border border-[var(--border)] flex items-center justify-between text-[10px]"
                                  >
                                    <span className="font-bold text-[var(--text-primary)] truncate">
                                      {item.vehicleYear || ''} {item.vehicleMake || ''} {item.vehicleModel || ''}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onUnassignFromDispatch(item.id)}
                                      className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--error)]"
                                      title="Unwire / Remove"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-[var(--text-secondary)] italic">
                                  Drop vehicles or connect wire
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3. Container Node Body */}
                    {node.type === 'container' && (() => {
                      const c = containers.find((item) => item.id === node.entityId);
                      if (!c) return <p className="text-xs text-[var(--text-secondary)]">Container not found</p>;

                      const count = c.shipments?.length || 0;
                      const isFull = count >= c.maxCapacity;

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                              {c.containerNumber}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500">
                              {c.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            Port: <strong className="text-[var(--accent-gold)]">{c.destinationPort || 'TBD'}</strong>
                          </p>

                          {/* Capacity Progress Bar */}
                          <div>
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className="text-[var(--text-secondary)]">Capacity</span>
                              <span className={`font-bold ${isFull ? 'text-[var(--error)]' : 'text-[var(--accent-gold)]'}`}>
                                {count} / {c.maxCapacity} ({Math.round((count / c.maxCapacity) * 100)}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[var(--background)] overflow-hidden border border-[var(--border)]">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isFull ? 'bg-[var(--error)]' : 'bg-[var(--accent-gold)]'
                                }`}
                                style={{ width: `${Math.min((count / c.maxCapacity) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Stowed Vehicles */}
                          <div className="pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                Stowed Cargo ({count})
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWireframeModalState({
                                    open: true,
                                    type: 'container',
                                    id: c.id,
                                  });
                                }}
                                className="text-[10px] text-indigo-400 font-bold hover:underline flex items-center gap-0.5"
                              >
                                <Layers className="w-3 h-3" />
                                <span>Wireframe</span>
                              </button>
                            </div>

                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {c.shipments && c.shipments.length > 0 ? (
                                c.shipments.map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-1.5 rounded bg-[var(--background)] border border-[var(--border)] flex items-center justify-between text-[10px]"
                                  >
                                    <span className="font-bold text-[var(--text-primary)] truncate">
                                      {item.vehicleYear || ''} {item.vehicleMake || ''} {item.vehicleModel || ''}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onUnassignFromContainer(item.id)}
                                      className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--error)]"
                                      title="Unwire / Remove"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-[var(--text-secondary)] italic">
                                  Drop vehicles or connect wire
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4. Port Node Body */}
                    {node.type === 'port' && (
                      <div className="space-y-2 text-center py-2">
                        <MapPin className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          {node.title || node.entityId}
                        </h4>
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono block">
                          Destination Terminal
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setWireframeModalState({
                              open: true,
                              type: 'transit',
                              id: node.entityId,
                            })
                          }
                          className="mt-1 text-[10px] font-bold text-emerald-500 hover:underline inline-flex items-center gap-1"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Transit Blueprint</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Wireframe Specific Entity Quick Picker Modal */}
      <Modal
        open={showWireframePicker}
        onClose={() => setShowWireframePicker(false)}
        title="Inspect Specific Wireframe & Supply Chain Lineage"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Select any vehicle, ocean container, or carrier dispatch to inspect its exact end-to-end wireframe, stowing layout, and multi-modal transit checkpoints:
          </p>

          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search VIN, container #, dispatch reference, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)]"
            />
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {/* 1. Shipments Section */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1 mb-2">
                <Package className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                Vehicles & Cargo Shipments ({shipments.length})
              </span>
              <div className="space-y-1.5">
                {shipments
                  .filter(
                    (s) =>
                      !searchQuery ||
                      `${s.vehicleYear} ${s.vehicleMake} ${s.vehicleModel} ${s.vehicleVIN} ${s.lotNumber}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 8)
                  .map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">
                          {s.vehicleYear || ''} {s.vehicleMake || ''} {s.vehicleModel || ''}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--text-secondary)]">
                          VIN: {s.vehicleVIN || 'N/A'} {s.lotNumber ? `• Lot #${s.lotNumber}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowWireframePicker(false);
                            handleFocusEntityWireframe(
                              'shipment',
                              s.id,
                              `${s.vehicleYear || ''} ${s.vehicleMake || ''} (${s.vehicleVIN?.slice(-6) || ''})`
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--panel)] border text-[var(--text-primary)] hover:border-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                        >
                          <Target className="w-3 h-3 text-indigo-400" />
                          <span>Focus Canvas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowWireframePicker(false);
                            setWireframeModalState({
                              open: true,
                              type: 'shipment',
                              id: s.id,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Blueprint</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 2. Containers Section */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1 mb-2">
                <Ship className="w-3.5 h-3.5 text-indigo-500" />
                Ocean Containers ({containers.length})
              </span>
              <div className="space-y-1.5">
                {containers
                  .filter(
                    (c) =>
                      !searchQuery ||
                      `${c.containerNumber} ${c.destinationPort} ${c.vesselName}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-indigo-500 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[var(--text-primary)]">
                          {c.containerNumber}
                        </span>
                        <p className="text-[10px] text-indigo-400 mt-0.5">
                          Port: {c.destinationPort || 'TBD'} • Stowed: {c.shipments?.length || 0} / {c.maxCapacity}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowWireframePicker(false);
                            handleFocusEntityWireframe('container', c.id, c.containerNumber);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--panel)] border text-[var(--text-primary)] hover:border-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                        >
                          <Target className="w-3 h-3 text-indigo-400" />
                          <span>Focus Canvas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowWireframePicker(false);
                            setWireframeModalState({
                              open: true,
                              type: 'container',
                              id: c.id,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Blueprint</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 3. Dispatches Section */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1 mb-2">
                <Truck className="w-3.5 h-3.5 text-blue-500" />
                Carrier Dispatches ({dispatches.length})
              </span>
              <div className="space-y-1.5">
                {dispatches
                  .filter(
                    (d) =>
                      !searchQuery ||
                      `${d.referenceNumber} ${d.company?.name} ${d.origin} ${d.destination}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .map((d) => (
                    <div
                      key={d.id}
                      className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-blue-500 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[var(--text-primary)]">
                          {d.referenceNumber}
                        </span>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          Carrier: {d.company?.name || 'Carrier'} • {d.origin} → {d.destination}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowWireframePicker(false);
                            handleFocusEntityWireframe('dispatch', d.id, d.referenceNumber);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--panel)] border text-[var(--text-primary)] hover:border-blue-500 hover:text-blue-400 flex items-center gap-1"
                        >
                          <Target className="w-3 h-3 text-blue-400" />
                          <span>Focus Canvas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowWireframePicker(false);
                            setWireframeModalState({
                              open: true,
                              type: 'dispatch',
                              id: d.id,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Blueprint</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Items Modal */}
      <Modal
        open={Boolean(showAddModal)}
        onClose={() => setShowAddModal(null)}
        title={`Add ${showAddModal ? showAddModal.toUpperCase() : ''} Node(s) to Canvas`}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${showAddModal}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)]"
            />
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {showAddModal === 'shipment' &&
              shipments
                .filter(
                  (s) =>
                    !searchQuery ||
                    `${s.vehicleYear} ${s.vehicleMake} ${s.vehicleModel} ${s.vehicleVIN} ${s.lotNumber}`
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                )
                .map((s) => {
                  const isSelected = selectedToAdd.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() =>
                        setSelectedToAdd((prev) =>
                          prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                        )
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                          : 'border-[var(--border)] bg-[var(--background)] hover:bg-[var(--panel)]'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {s.vehicleYear || ''} {s.vehicleMake || ''} {s.vehicleModel || ''}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
                          VIN: {s.vehicleVIN || 'N/A'} {s.lotNumber ? `• Lot #${s.lotNumber}` : ''}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-secondary)]" />
                      )}
                    </div>
                  );
                })}

            {showAddModal === 'dispatch' &&
              dispatches
                .filter(
                  (d) =>
                    !searchQuery ||
                    `${d.referenceNumber} ${d.company?.name} ${d.origin} ${d.destination}`
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                )
                .map((d) => {
                  const isSelected = selectedToAdd.includes(d.id);
                  return (
                    <div
                      key={d.id}
                      onClick={() =>
                        setSelectedToAdd((prev) =>
                          prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                        )
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                          : 'border-[var(--border)] bg-[var(--background)] hover:bg-[var(--panel)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                            {d.referenceNumber}
                          </span>
                          <span className="text-[10px] text-blue-500 font-semibold">({d.company?.name})</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {d.origin} → {d.destination}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-secondary)]" />
                      )}
                    </div>
                  );
                })}

            {showAddModal === 'container' &&
              containers
                .filter(
                  (c) =>
                    !searchQuery ||
                    `${c.containerNumber} ${c.destinationPort} ${c.vesselName}`
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                )
                .map((c) => {
                  const isSelected = selectedToAdd.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() =>
                        setSelectedToAdd((prev) =>
                          prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        )
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                          : 'border-[var(--border)] bg-[var(--background)] hover:bg-[var(--panel)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                            {c.containerNumber}
                          </span>
                          <span className="text-[10px] text-indigo-400 font-semibold">({c.destinationPort})</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Capacity: {c.shipments?.length || 0} / {c.maxCapacity}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-secondary)]" />
                      )}
                    </div>
                  );
                })}

            {showAddModal === 'port' &&
              ['Port of Jebel Ali (AEJEA)', 'Port of Newark (USNWK)', 'Port of Klaipeda (LTKLJ)', 'Port of Aqaba (JOAQB)', 'Port of Poti (GEPOT)', 'Port of Houston (USHOU)'].map(
                (port) => {
                  const isSelected = selectedToAdd.includes(port);
                  return (
                    <div
                      key={port}
                      onClick={() =>
                        setSelectedToAdd((prev) =>
                          prev.includes(port) ? prev.filter((id) => id !== port) : [...prev, port]
                        )
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                          : 'border-[var(--border)] bg-[var(--background)] hover:bg-[var(--panel)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">{port}</span>
                      </div>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-secondary)]" />
                      )}
                    </div>
                  );
                }
              )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              {showAddModal === 'dispatch' && onOpenCreateDispatch && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(null);
                    onOpenCreateDispatch();
                  }}
                  className="text-xs font-bold text-blue-500 hover:underline"
                >
                  + Create New Dispatch
                </button>
              )}
              {showAddModal === 'container' && onOpenCreateContainer && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(null);
                    onOpenCreateContainer();
                  }}
                  className="text-xs font-bold text-indigo-500 hover:underline"
                >
                  + Create New Container
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={selectedToAdd.length === 0}
                onClick={() => showAddModal && handleAddSelectedToCanvas(showAddModal)}
              >
                Add ({selectedToAdd.length}) to Canvas
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Specific Entity Detailed Wireframe Blueprint & Transit Modal */}
      <EntityWireframeModal
        open={wireframeModalState.open}
        onClose={() => setWireframeModalState((prev) => ({ ...prev, open: false }))}
        entityType={wireframeModalState.type}
        entityId={wireframeModalState.id}
        shipments={shipments}
        dispatches={dispatches}
        containers={containers}
        onSelectEntity={(type, id) => {
          setWireframeModalState({
            open: true,
            type,
            id,
          });
        }}
        onInspectDamage={onInspectShipment}
      />
    </div>
  );
}
