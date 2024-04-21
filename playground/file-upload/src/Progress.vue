<template>
  <div
    class="w-full h-[300px] progress_wrap p-[11px] border border-solid border-[#31363c] rounded-[6px]"
  >
    <div
      v-for="(item, index) in group"
      :class="[
        'h-full rounded-[2px] transition-colors duration-300',
        item.class,
      ]"
      :key="index"
    ></div>
  </div>

  <div class="p-[4px] _between text-[12px] text-[#868d96]">
    <div class="">
      {{ fileSize }}
    </div>

    <div class="_right gap-[4px]">
      <span>Less</span>
      <div
        :class="['rounded-[2px] w-[10px] h-[10px]', ProgressStateClass.PENDING]"
      ></div>
      <div
        :class="['rounded-[2px] w-[10px] h-[10px]', ProgressStateClass.STATE1]"
      ></div>
      <div
        :class="['rounded-[2px] w-[10px] h-[10px]', ProgressStateClass.STATE2]"
      ></div>
      <div
        :class="['rounded-[2px] w-[10px] h-[10px]', ProgressStateClass.STATE3]"
      ></div>
      <div
        :class="['rounded-[2px] w-[10px] h-[10px]', ProgressStateClass.DONE]"
      ></div>
      <span>More Uploaded</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ChunkUploadProgress } from '@/upload';

interface Props {
  progressMap: ChunkUploadProgress;
  fileSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  progressMap: () => ({}),
  fileSize: 0,
});

defineExpose({
  init,
  resetProgress,
  completeProgress,
});

const GROUP_SIZE = 406;

interface GroupItem {
  class: string;
}

const enum ProgressStateClass {
  PENDING = 'bg-[#171b21]',
  STATE1 = 'bg-[#1f432b]',
  STATE2 = 'bg-[#2e6b38]',
  STATE3 = 'bg-[#52a44e]',
  DONE = 'bg-[#6cd064]',
  ERROR = 'bg-[#d9534f]',
}

const group = ref<GroupItem[]>(
  Array(GROUP_SIZE)
    .fill(1)
    .map(() => ({ class: ProgressStateClass.PENDING }))
);

const connection = ref<Array<[string[], GroupItem[]]>>([]);

const fileSize = computed(() => {
  let size = props.fileSize;
  if (!size) return '';
  const unit = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (size > 1024 && i < unit.length) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${unit[i]}`;
});

let needUpdate = false;
watch(
  () => props.progressMap,
  () => {
    needUpdate = true;
    // yield to main
    requestAnimationFrame(() => {
      if (!needUpdate) return;
      updateProgressState();
      needUpdate = false;
    });
  }
);

function updateProgressState() {
  connection.value.forEach(([hashKeys, groupItems]) => {
    const percent =
      hashKeys.reduce((acc, key) => {
        const progress = props.progressMap[key] || 0;
        return acc + progress;
      }, 0) / hashKeys.length;

    const state =
      percent === 0
        ? ProgressStateClass.PENDING
        : percent < 30
        ? ProgressStateClass.STATE1
        : percent < 60
        ? ProgressStateClass.STATE2
        : percent < 100
        ? ProgressStateClass.STATE3
        : ProgressStateClass.DONE;

    groupItems.forEach((item) => {
      item.class = state;
    });
  });
}

function init(hashKeys: string[]) {
  resetProgress();
  bindingConnection(hashKeys);
}

function resetProgress() {
  group.value.forEach((item) => {
    item.class = ProgressStateClass.PENDING;
  });
}

function completeProgress() {
  group.value.forEach((item) => {
    item.class = ProgressStateClass.DONE;
  });
}

function bindingConnection(hashKeys: string[]) {
  if (hashKeys.length === 0) {
    connection.value = [];
    return;
  }

  const shuffleGroup = shuffleArray([...group.value]);

  const [splitTarget, lessTarget, size] =
    hashKeys.length < GROUP_SIZE
      ? [shuffleGroup, hashKeys, hashKeys.length]
      : [hashKeys, shuffleGroup, GROUP_SIZE];

  const splitChunks = splitArray<GroupItem | string>(splitTarget, size);

  connection.value = lessTarget.map<any>((item: GroupItem | string) => {
    const chunk = splitChunks.pop()!;
    return hashKeys.length < GROUP_SIZE ? [[item], chunk] : [chunk, [item]];
  });
}

function shuffleArray<T extends any>(arr: T[]): T[] {
  for (let i = 0; i < arr.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function splitArray<T extends any>(arr: T[], size: number) {
  if (size < 1) return [...arr];

  const result: T[][] = [];
  const chunkSize = Math.floor(arr.length / size);

  let s = 0;
  while (s < arr.length) {
    if (result.length === size) {
      result[result.length - 1].push(...arr.slice(s));
      break;
    }

    const next = s + chunkSize;
    result.push(arr.slice(s, next));
    s = next;
  }

  return result;
}
</script>

<style lang="scss" scoped>
.progress_wrap {
  display: grid;
  grid-template-columns: repeat(auto-fit, 15px);
  grid-template-rows: repeat(auto-fit, 15px);
  gap: 5px;
}
</style>
