<script setup lang="ts">
/**
 * 划重点预览弹窗（骨架占位）
 *
 * 后续 P3 实现：高亮原文片段 + 一键导入 draftSchedules。
 * 当前默认不显示，不影响整体运行。
 */
import { ref } from 'vue';

const visible = ref(false);
</script>

<template>
  <el-dialog v-model="visible" title="划重点预览" width="600px">
    <p style="color: #909399">划重点预览 —— 待 P3 实现</p>
  </el-dialog>
</template>
