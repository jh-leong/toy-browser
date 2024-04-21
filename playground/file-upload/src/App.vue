<template>
  <div class="h-[100vh] flex items-center justify-center flex-col">
    <label
      ref="fileUploadContainer"
      class="w-[600px] block cursor-pointer relative"
    >
      <div class="_between mb-[8px]">
        <div class="text-color-[#868d96] text-[14px] flex">
          Click or Drag files here to upload
          <div :class="['ml-[8px]', { 'animate-bounce': !files.length }]">
            ↓
          </div>
        </div>

        <div class="tooltip text-slate-500" :data-tip="filename">
          <input
            class="opacity-0 absolute w-0 h-0"
            type="file"
            :disabled="loading"
            @change="onFileChange"
          />

          <span class="text-sm ml-[12px]" @click.stop="previewFile">{{
            shortenedFilename
          }}</span>
        </div>
      </div>

      <Progress
        ref="progressComp"
        :pulse="uploaderPending || isDragging"
        :fileSize="fileSize"
        :progressMap="progressMap"
      ></Progress>
    </label>

    <div class="_center mt-[16px]">
      <button
        class="btn btn-primary w-[180px]"
        :disabled="!files.length || loading || !changed"
        @click="handleUpload"
      >
        <span v-if="loading" class="loading loading-spinner"></span>
        Upload
      </button>

      <button
        class="btn btn-neutral w-[180px] ml-[48px]"
        :disabled="disabledCancel"
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

const fileUploader = ref<FileUploader>();

onMounted(() => {
  bindingDragEvents();
});

const filename = computed(() => {
  return files.value[0]?.name || '';
});

const shortenedFilename = computed(() => {
  const name = filename.value;
  if (!name) return '';
  if (name.length < 30) return name;
  return `${name.slice(0, 15)}...${name.slice(-15)}`;
});

const fileSize = computed(() => {
  return files.value[0]?.size;
});

const fileUploadContainer = ref<Element>();
function bindingDragEvents() {
  const container = fileUploadContainer.value!;

  ['dragenter', 'dragover', 'drop', 'dragleave'].forEach((eventName) => {
    container.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        isDragging.value = ['dragenter', 'dragover'].includes(eventName);

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
  files.value = [file];
  changed.value = true;
  fileUploader.value = new FileUploader(file, { onProgress, onChunkComplete });
  progressComp.value?.resetProgress();
}

const changed = ref(false);

const uploaderState = computed(() => {
  return fileUploader.value?.state;
});

const uploaderPending = computed(() => {
  return fileUploader.value?.state === UploadState.PENDING;
});

const isDragging = ref(false);

const loading = computed(() => {
  return (
    fileUploader.value?.state === UploadState.UPLOADING || uploaderPending.value
  );
});

const disabledCancel = computed(() => {
  return fileUploader.value?.state !== UploadState.UPLOADING;
});

async function handleUpload() {
  try {
    if (uploaderState.value === UploadState.PAUSED) {
      await fileUploader.value?.resume();
    } else {
      await fileUploader.value?.upload();
    }

    if (uploaderState.value === UploadState.UPLOADED) {
      progressComp.value?.completeProgress();
    } else if (uploaderState.value === UploadState.SUCCESS) {
      cusAlert('Upload success!');
    }

    changed.value = false;
  } catch (err) {
    cusAlert('Upload failed! Please try again.');
    console.error('[ handleUpload ]:', err);
  }
}

function cusAlert(msg: string) {
  setTimeout(() => {
    alert(msg);
  }, 300);
}

function pauseUpload() {
  fileUploader.value?.pause();
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

function previewFile(e: Event) {
  e.stopPropagation();

  const file = files.value[0];

  if (
    !file ||
    file.size > 1024 * 1024 * 100 ||
    !['image/png', 'image/jpeg', 'image/gif'].includes(file.type)
  )
    return;

  const src = URL.createObjectURL(file);
  window.open(src);
  URL.revokeObjectURL(src);
}
</script>

<style>
@import './assets/common.scss';
</style>
