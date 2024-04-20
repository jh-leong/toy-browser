<template>
  <div class="h-[100vh] flex items-center justify-center flex-col">
    <label ref="fileUploadContainer" class="w-[600px] block cursor-pointer">
      <div class="_between mb-[12px]">
        <div class="text-slate-500">
          <input
            class="text-[0] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            type="file"
            :disabled="loading"
            @change="onFileChange"
          />

          <span class="text-sm ml-[12px]">{{ filename }}</span>
        </div>

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

    <div class="_center mt-[24px]">
      <button
        class="btn btn-primary w-[180px]"
        :disabled="!files.length || loading"
        @click="handleUpload"
      >
        <span v-if="loading" class="loading loading-spinner"></span>
        Upload
      </button>

      <button
        class="btn btn-neutral w-[180px] ml-[48px]"
        :disabled="!loading"
        @click="pauseUpload"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  ChunkUploadProgress,
  FileChunk,
  FileUploader,
  UploadState,
} from '@/upload';
import Progress from './Progress.vue';

const files = ref<File[]>([]);

let fileUploader: FileUploader;

onMounted(() => {
  bindingDragEvents();
});

const filename = computed(() => {
  const name = files.value[0]?.name;
  if (!name) return 'No file chosen';
  if (name.length < 20) return name;
  return `${name.slice(0, 10)}...${name.slice(-10)}`;
});

const fileUploadContainer = ref<Element>();
function bindingDragEvents() {
  const container = fileUploadContainer.value!;

  ['dragenter', 'dragover', 'drop'].forEach((eventName) => {
    container.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (eventName === 'drop') {
          const [file] = (e as any).dataTransfer.files;
          if (!file) return;
          prepareUpload(file);
        }
      },
      true
    );
  });
}

function onFileChange(e: any) {
  const [file] = e.target.files;
  if (!file) return;
  prepareUpload(file);
}

function prepareUpload(file: File) {
  console.log('[ file ]:', file);
  fileUploader = new FileUploader(file);
  files.value = [file];
  progressComp.value?.resetProgress();
}

const loading = ref(false);

async function handleUpload() {
  try {
    loading.value = true;

    if (fileUploader.state === UploadState.PAUSED) {
      await fileUploader.resume();
    } else {
      await fileUploader.upload({ onProgress, onChunkComplete });
    }

    if (fileUploader.state === UploadState.UPLOADED) {
      progressComp.value?.completeProgress();
    }

    cusAlert('Upload success!');
  } catch (err) {
    cusAlert('Upload failed!');
    console.error('[ handleUpload ]:', err);
  } finally {
    loading.value = false;
  }
}

function cusAlert(msg: string) {
  setTimeout(() => {
    alert(msg);
  }, 300);
}

function pauseUpload() {
  fileUploader.pause();
  loading.value = false;
}

const progressComp = ref();
function onChunkComplete(chunks: FileChunk[]) {
  progressComp.value?.init(chunks.map((i) => i.chunkHash));
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
