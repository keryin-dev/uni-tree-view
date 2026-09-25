import type { CHECK_STATUS_MAP } from "./constants/index";

export type TreeKey = string | number;

export type CheckStatus = typeof CHECK_STATUS_MAP[keyof typeof CHECK_STATUS_MAP];

export type TreeModelValue = TreeKey | TreeKey[] | null;

export interface TreeDataItem {
  [key: string]: any;
}

export interface TreeNode {
  id: TreeKey;
  label: string;
  append: string;
  icon: string;
  path: string[];
  source: TreeDataItem;
  parentId?: TreeKey;
  parentIds: TreeKey[];
  parents: TreeDataItem[];
  level: number;
  disabled: boolean;
  checked: CheckStatus;
  expanded: boolean;
  visible: boolean;
  isLeaf: boolean;
  loaded: boolean;
  loading: boolean;
  loadError: unknown;
}

export interface TreeProps {
  id: string;
  label: string;
  children: string;
  disabled?: string;
  leaf?: string;
  append?: string;
  icon?: string;
}

export interface TreeCheckChangePayload {
  value: TreeModelValue;
  keys: TreeKey[];
  nodes: TreeNode[];
  /** Current half-checked keys in linked multiple-selection mode. */
  halfCheckedKeys: TreeKey[];
  /** Current half-checked nodes in linked multiple-selection mode. */
  halfCheckedNodes: TreeNode[];
  node: TreeNode;
}

export interface TreeLoadPayload {
  node: TreeNode;
  children: TreeDataItem[];
}

export interface TreeLoadErrorPayload {
  node: TreeNode;
  error: unknown;
}

export interface TreeScrollToOptions {
  /** Expand ancestors before locating the node. */
  expandParents?: boolean;
}

export interface TreeExpandPayload {
  expanded: boolean;
  node: TreeNode;
}

export interface TreeNodeClickPayload {
  id: TreeKey;
  node: TreeNode;
  path: TreeNode[];
}

export interface TreeFilterPayload {
  value: string;
  /** Visible keys after filtering, including direct matches, ancestors and descendants. */
  keys: TreeKey[];
  /** Visible nodes after filtering, including direct matches, ancestors and descendants. */
  nodes: TreeNode[];
  /** Keys directly matched by the built-in or custom filter rule. */
  matchedKeys: TreeKey[];
  /** Nodes directly matched by the built-in or custom filter rule. */
  matchedNodes: TreeNode[];
}

export interface TreeSlotProps {
  node: TreeNode;
  data: TreeDataItem;
  path: TreeNode[];
}

export interface TreeEmptySlotProps {
  filterValue: string;
}

export interface UniTreeViewSlots {
  default?: (props: TreeSlotProps) => unknown;
  label?: (props: TreeSlotProps) => unknown;
  icon?: (props: TreeSlotProps) => unknown;
  append?: (props: TreeSlotProps) => unknown;
  empty?: (props: TreeEmptySlotProps) => unknown;
  "empty-filter"?: (props: TreeEmptySlotProps) => unknown;
}

export interface UniTreeViewProps {
  /** Current selected value. Single select uses one key, multiple select uses an array. */
  modelValue?: TreeModelValue;
  /** Tree data. */
  data?: TreeDataItem[];
  /** Filter keyword. Matching nodes and their related branch stay visible. */
  filterValue?: string;
  /** Custom node matcher used when filterValue is not empty. */
  filterMethod?: (value: string, node: TreeNode) => boolean;
  /** Highlight literal filter keyword matches in the built-in label. */
  highlightFilter?: boolean;
  /** Default checked keys for uncontrolled initial state. */
  defaultCheckedKeys?: TreeKey | TreeKey[] | null;
  /** Field mapping for id, label, children, disabled, leaf, append and icon. */
  treeProps?: Partial<TreeProps>;
  /** Theme color for active checkbox/radio. */
  themeColor?: string;
  /** Whether to enable and show the selection control. */
  selectable?: boolean;
  /** Whether to show radio UI in single-select mode. */
  showRadioIcon?: boolean;
  /** Whether to support multiple selection. */
  multiple?: boolean;
  /** Whether clicking a node row changes its selection state. */
  checkOnClickNode?: boolean;
  /** Whether clicking a leaf node row changes its selection state. */
  checkOnClickLeaf?: boolean;
  /** Whether clicking a node row expands or collapses it. */
  expandOnClickNode?: boolean;
  /** Whether expanding a node collapses its expanded siblings. */
  accordion?: boolean;
  /** Whether parent and child checked states are independent. */
  checkStrictly?: boolean;
  /** Single-select mode can only select leaf nodes. Ignored when `multiple` is true. */
  onlyRadioLeaf?: boolean;
  /** Whether all nodes are expanded initially. */
  defaultExpandAll?: boolean;
  /** Default expanded node keys. */
  defaultExpandedKeys?: TreeKey[];
  /** Whether default expanded keys also expand all their ancestors. */
  defaultExpandParent?: boolean;
  /** Expand ancestors of checked nodes initially. */
  expandChecked?: boolean;
  /** Preserve runtime expanded state when tree data is rebuilt. */
  cacheExpandedKeys?: boolean;
  /** Lazy load mode. Nodes can be expanded before children exist. */
  loadMode?: boolean;
  /** Lazy load function. */
  loadApi?: (node: TreeNode) => TreeDataItem[] | Promise<TreeDataItem[]>;
  /** Custom leaf resolver. */
  isLeafFn?: (item: TreeDataItem, node: TreeNode) => boolean;
  /** Load once on first expand even when static children exist. */
  alwaysFirstLoad?: boolean;
  /** Whether disabled nodes can participate in selection state changes. */
  checkedDisabled?: boolean;
  /** Whether checked disabled nodes are included in returned keys/nodes. */
  packDisabledKey?: boolean;
  /** Custom class name added to every node row. */
  nodeClass?: string;
  /** Tree item indent in px. */
  indent?: number;
  /** Selection control placement. */
  selectionPlacement?: "left" | "right";
  /** Empty text shown when data is empty. */
  emptyText?: string;
  /** Show label path under the node label. */
  showPath?: boolean;
  /** Separator used by the built-in path display. */
  pathSeparator?: string;
  /** Enable fixed-height virtual rendering for very large visible node lists. */
  virtual?: boolean;
  /** Row height in px when virtual rendering is enabled. */
  virtualItemHeight?: number;
  /** Scroll container height in px when virtual rendering is enabled. */
  virtualHeight?: number;
  /** Extra rows rendered before and after the viewport in virtual mode. */
  virtualOverscan?: number;
}

export interface UniTreeViewExposed {
  setCheckedKeys: (keys: TreeKey | TreeKey[], checked?: boolean) => TreeModelValue;
  getCheckedKeys: () => TreeKey[];
  getHalfCheckedKeys: () => TreeKey[];
  getUncheckedKeys: () => TreeKey[];
  getCheckedNodes: () => TreeNode[];
  getHalfCheckedNodes: () => TreeNode[];
  getUncheckedNodes: () => TreeNode[];
  setExpandedKeys: (keys: TreeKey[] | "all", expanded?: boolean) => void;
  getExpandedKeys: () => TreeKey[];
  getUnexpandedKeys: () => TreeKey[];
  getVisibleKeys: () => TreeKey[];
  getMatchedKeys: () => TreeKey[];
  getExpandedNodes: () => TreeNode[];
  getUnexpandedNodes: () => TreeNode[];
  getVisibleNodes: () => TreeNode[];
  getMatchedNodes: () => TreeNode[];
  getNode: (key: TreeKey) => TreeNode | undefined;
  getNodePath: (keyOrNode: TreeKey | TreeNode) => TreeNode[];
  expandAll: () => void;
  collapseAll: () => void;
  loadNode: (node: TreeNode) => Promise<TreeDataItem[]>;
  retryLoad: (keyOrNode: TreeKey | TreeNode) => Promise<TreeDataItem[]>;
  /** 返回是否已提交定位指令，不等待原生滚动停稳；不可见目标或被取消的虚拟定位返回 false。 */
  scrollToKey: (key: TreeKey, options?: TreeScrollToOptions) => Promise<boolean>;
}

/**
 * 事件表使用 Vue 3.3+ 的「具名元组」形态，且必须是 type 别名而非 interface：
 * `defineEmits<T>()` 的约束是 `Record<string, any[]>`，interface 没有隐式索引签名，无法满足。
 */
// eslint-disable-next-line ts/consistent-type-definitions -- interface 无隐式索引签名，不满足 defineEmits 约束
export type UniTreeViewEmits = {
  "update:modelValue": [value: TreeModelValue];
  "check-change": [payload: TreeCheckChangePayload];
  "expand-change": [payload: TreeExpandPayload];
  "load": [payload: TreeLoadPayload];
  "load-error": [payload: TreeLoadErrorPayload];
  "node-click": [payload: TreeNodeClickPayload];
  "filter-change": [payload: TreeFilterPayload];
};