<template>
  <div
    class="w-full h-full progress_wrap p-[10px] border border-solid border-[#31363c] rounded-[6px]"
  >
    <div
      v-for="(item, index) in group"
      :class="[
        'progress_item h-full rounded-[2px] transition-colors',
        item.class,
      ]"
      :key="index"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ChunkUploadProgress } from '@/upload';

interface Props {
  progressMap: ChunkUploadProgress;
}

const props = withDefaults(defineProps<Props>(), {
  progressMap: () => ({}),
});

defineExpose({ init, resetProgress });

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

watch(
  () => props.progressMap,
  () => {
    // todo yieldToMain ?
    updateProgressState();
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
