<template>
  <div class="h-[100vh] flex items-center justify-center flex-col">
    <label class="w-[600px] block cursor-pointer">
      <div class="_between mb-[12px]">
        <input
          class="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          type="file"
          :disabled="loading"
          @change="onFileChange"
        />

        <div class="text-color-[#868d96] text-[14px]">
          Click or Drag files here to upload ↓
        </div>
      </div>

      <Progress
        class="!h-[300px]"
        ref="progressComp"
        :progressMap="progressMap"
      ></Progress>
    </label>

    <button
      class="btn btn-primary mt-[24px] w-[180px]"
      :disabled="!files.length || loading"
      @click="handleUpload"
    >
      <span v-if="loading" class="loading loading-spinner"></span>
      Upload
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ChunkUploadProgress, FileChunk, doUploadFlow } from '@/upload';
import Progress from './Progress.vue';

const files = ref<File[]>([]);

function onFileChange(e: any) {
  const [file] = e.target.files;
  if (!file) return;

  console.log('[ file ]:', file);

  files.value = [file];
  progressComp.value?.resetProgress();
}

const loading = ref(false);

async function handleUpload() {
  const file = files.value[0];

  loading.value = true;

  const ret = await doUploadFlow(file, { onProgress, onChunkComplete });

  if (ret?.uploaded) progressComp.value?.completeProgress();

  loading.value = false;
}

const progressComp = ref();
function onChunkComplete(_: FileChunk[], progressMap: ChunkUploadProgress) {
  progressComp.value?.init(Object.keys(progressMap));
}

const progressMap = ref<ChunkUploadProgress>({});
function onProgress(map: ChunkUploadProgress) {
  // 结构创建新对象，触发更新
  progressMap.value = { ...map };
}
</script>

<style scoped>
._center {
  display: flex;
  justify-content: center;
  align-items: center;
}

._column {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

._between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
