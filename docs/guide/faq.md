# 常见问题

## 树组件为什么没有显示数据？

按顺序检查：

1. `data` 是否为**数组**，而不是单个对象
2. 数据字段名是否为默认的 `id`、`label`、`children`；如果不是，是否通过 `tree-props` 配置了字段映射
3. 组件外层容器是否有可用高度；组件默认 `height: 100%`，父容器高度为 0 时不会显示

每个节点都必须提供 key，并且在整棵树中全局唯一。默认使用节点的 `id` 作为 key；配置了 `tree-props.id` 后，则使用映射后的字段。缺失或重复 key 会导致展开、选择和列表渲染互相覆盖，开发环境下组件会在控制台输出对应警告。

## 修改 `data` 后，页面为什么没有更新？

为了避免万级节点场景下深度监听整棵树，组件只监听 `data` 根数组的引用变化。只执行 `push`、`splice` 或直接修改节点字段，不会触发组件重新解析；修改完成后还需要替换根数组：

```ts
treeData.value[0].children.push(newNode);
treeData.value = [...treeData.value];
```

节点选中状态在数据重新解析时按 key 匹配。这里可以简单分成两种用法：

- **绑定了 `v-model`（受控值）**：数据刷新后，以当前 `v-model` 中的 key 为准重新计算选中状态。
- **没有绑定 `v-model`（非受控状态）**：`default-checked-keys` 只提供初始值，之后由组件内部记录用户的选择；数据刷新后，相同 key 的节点会保留原来的选中状态。

key 表示节点的唯一身份，不是节点的显示文字。例如节点的 `id` 仍为 `user-1`，只把 `name`、`label` 或其他展示内容改了，组件仍会认为它是同一个节点，选中状态不会改变；如果 key 也变了，就会被当作一个新节点，不会继承原节点的选中状态。

::: tip 受控和非受控是什么意思？
“受控”就是绑定了 `v-model`，选中值由外部变量提供；“非受控”就是没有绑定 `v-model`，运行时选中状态由组件自己保存。用户点击时，组件会先更新界面，再通知外部；父组件拒绝新值时如何恢复，见下方对应问题。
:::

运行时的展开状态与选中状态是两套状态。替换 `data` 后如果还希望保留用户已经展开的节点，请开启 `cache-expanded-keys`。

`tree-props` 的映射配置发生响应式变化时，组件也会重新解析整棵树；但它只负责声明字段名，不会改变 `data` 不做深度监听的约定。

## 更新 `data` 后，`v-model` 中不存在的 key 怎么处理？

非懒加载模式下，组件会重新按新数据归一化受控值。如果原 `v-model` 中的 key 已不存在，会触发 `update:modelValue` 回传清理后的值；父组件需要接收这次更新，才能让受控值与界面保持一致。这个过程没有具体的用户操作节点，因此不会触发 `check-change`。

懒加载模式不会仅因当前状态树中找不到 key 就立即删除它，因为该 key 可能属于尚未加载的后代。待节点加载后，组件会再应用对应的选中状态。

## 为什么 `setCheckedKeys` 传入未加载 key 后没有立即选中？

懒加载节点尚未进入状态树时，组件无法立即判断它是否为叶子、是否禁用，也无法返回对应节点对象。此时 key 会进入等待队列，`setCheckedKeys` 返回当前实际生效的值，不会伪造一次选中事件。

目标节点加载成功且满足选择规则后，组件会自动补选，并触发 `update:modelValue` 和 `check-change`。如果需要取消等待，可在节点出现前调用 `setCheckedKeys(key, false)`。

## 选中节点后，为什么 `v-model` 的值没有更新？

按顺序检查：

1. 是否传入了 `selectable`。用户点击产生选择时必须启用该属性；未启用时，组件只展示树，不会因为点击而更新选中值。
2. 是否点击了选择图标。默认点击箭头只会展开或收起，点击节点文字也不会选中。若希望点击整行时选中，可开启 `check-on-click-node`；若只允许点击叶子节点行时选中，可使用 `check-on-click-leaf`。
3. `v-model` 的初始值类型是否与选择模式一致。

单选模式是传入 `selectable`、不传 `multiple`。此时 `v-model` 是**单个节点的 key**，也就是该节点的 `id`（或 `tree-props.id` 映射字段值），例如字符串 `"frontend"` 或数字 `1001`；没有选中项时为 `null`：

```ts
import { ref } from "vue";

const selectedKey = ref<string | number | null>(null);
```

多选模式需要同时传入 `selectable` 和 `multiple`，此时 `v-model` 是 key 数组：

```ts
const checkedKeys = ref<Array<string | number>>([]);
```

```vue
<!-- 单选：selectedKey 是单个 key 或 null -->
<uni-tree-view v-model="selectedKey" selectable :data="treeData" />

<!-- 多选：checkedKeys 是 key 数组 -->
<uni-tree-view v-model="checkedKeys" selectable multiple :data="treeData" />
```

如果使用的是单向绑定 `:model-value`，而不是 `v-model`，则需要自行监听 `update:modelValue` 并更新外部变量。

## 父组件不接受新的选中值时，界面为什么没有自动恢复？

用户选择节点时，组件会先更新内部显示状态，再触发 `update:modelValue` 和 `check-change`。因此，即使父组件经过校验后没有保存新值，组件内部也不会自动回到旧状态。

需要拒绝本次选择时，请通过 ref 调用 `setCheckedKeys` 恢复，并使用防重入标记，避免恢复操作再次进入同一段校验逻辑。下面示例使用 `check-strictly`，当选中数量超过 3 个时取消刚刚操作的节点：

```vue
<uni-tree-view
  ref="treeRef"
  v-model="value"
  selectable
  multiple
  check-strictly
  :data="data"
  @check-change="handleCheckChange"
/>
```

```ts
import { ref } from "vue";
import type { TreeCheckChangePayload, TreeKey, UniTreeViewExposed } from "uni-tree-view/shared";

const treeRef = ref<UniTreeViewExposed>();
const value = ref<TreeKey[]>([]);
const maxChecked = 3;
let rollingBack = false;

function handleCheckChange(payload: TreeCheckChangePayload) {
  if (rollingBack || payload.keys.length <= maxChecked) {
    return;
  }

  rollingBack = true;
  try {
    treeRef.value?.setCheckedKeys(payload.node.id, false);
  } finally {
    rollingBack = false;
  }
}
```

如果需要恢复一组复杂的父子选中状态，请在同一个防重入区间内完成清空和重新设置，避免恢复操作再次触发校验。

## 勾选父节点后，为什么子节点也会一起变化？

多选模式默认启用父子联动：

- 勾选父节点，会勾选它下面的所有可选子节点。
- 只勾选部分子节点时，父节点显示为半选。
- 所有可选子节点都选中后，父节点显示为全选。

如果希望父节点和子节点各自独立，开启 `check-strictly`：

```vue
<uni-tree-view selectable multiple check-strictly :data="data" />
```

## 禁用节点为什么不能被全选、清空或父子联动改变？

`checked-disabled` 控制禁用节点是否允许改变选中状态，默认值为 `false`。默认情况下，用户点击、全选、清空、父子联动、实例方法和外部更新 `v-model`，都不会改变禁用节点当前的选中状态。

如果业务上需要允许这些操作改变禁用节点，请显式开启：

```vue
<uni-tree-view selectable multiple checked-disabled :data="data" />
```

## 禁用节点为什么仍然出现在 `v-model` 或返回结果中？

节点能否改变选中状态，与选中后是否出现在返回结果中，是两件不同的事：

- `checked-disabled` 控制禁用节点的选中状态能不能被改变。
- `pack-disabled-key` 控制**已经选中的禁用节点**是否包含在返回结果中，默认值为 `true`。

`pack-disabled-key` 会影响：

- `v-model`
- `check-change` 的 `keys` 和 `nodes`
- `getCheckedKeys()` 和 `getCheckedNodes()`

如果不希望已选中的禁用节点出现在这些结果中，可设置：

```vue
<uni-tree-view selectable multiple :pack-disabled-key="false" :data="data" />
```

这只会把禁用节点从返回结果中排除，不会取消它在组件内部和界面上的选中状态。

在非严格多选模式下，禁用父节点仍会汇总子节点状态：部分子节点选中时显示半选，全部可选子节点选中时显示全选，但父节点本身不能直接操作。开启 `check-strictly` 后，父子状态互相独立，不再进行汇总。

## 开启虚拟渲染后，为什么会滚动错位？

虚拟模式要求**视口高度和每行高度都是固定的 px 数值**。`virtual-height` 和 `virtual-item-height` 当前不接受 `rpx`、`%`、`vh` 或 `calc()`。

内置节点会使用 `virtual-item-height` 作为实际行高。如果插槽内容比默认节点更高，需要同步调大该值，并避免使用高度会动态变化的内容，否则计算位置与实际位置不一致，就会出现滚动错位。

节点较少、内容总高度不足 `virtual-height` 时，组件会渲染全部节点，但滚动区域仍保持设置的固定高度，因此底部可能出现空白。这是定高虚拟列表的预期行为；需要高度随内容变化时，请关闭 `virtual`。

## 小程序中自定义样式为什么没有生效？

组件启用了 `virtualHost`，传给组件的普通 `class` 可以作用于组件根节点。如果需要定制每个节点行，请通过 `node-class` 传入稳定的外部类名；主题色、缩进和节点内容分别使用 `theme-color`、`indent` 与插槽进行定制。

不要直接依赖组件内部类名，同时需要注意小程序的组件样式隔离规则。

## 懒加载子节点失败后，怎么重新加载？

监听 `load-error` 事件提示用户，并通过 ref 调用 `retryLoad(key)` 重试：

```vue
<uni-tree-view ref="treeRef" load-mode :load-api="loadApi" @load-error="onError" />
```

```ts
function onError({ node, error }) {
  uni.showToast({ title: "加载失败", icon: "none" });
  // 稍后重试：treeRef.value.retryLoad(node.id)
}
```

## 如何把树组件放进弹窗选择器？

组合项目中已有的弹窗组件即可。下面以 wot-ui 为例：

```vue
<wd-popup v-model="show" position="bottom">
  <view style="height: 60vh;">
    <uni-tree-view v-model="value" selectable multiple :data="data" />
  </view>
</wd-popup>
```

## 还有其他问题？

提交 [Issue](https://github.com/keryin-dev/uni-tree-view/issues) 时，请附上**最小复现示例**，并说明运行平台、uni-app 版本、数据样例、期望行为和实际行为。
