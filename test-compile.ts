// 测试TypeScript编译
import { readFileTool } from './src/tools/file/read-file';
import { writeFileTool } from './src/tools/file/write-file';
import { listDirectoryTool } from './src/tools/file/list-directory';
import { updateFileTool } from './src/tools/file/update-file';

console.log('工具定义检查:');
console.log('1. read_file:', readFileTool.definition.name);
console.log('2. write_file:', writeFileTool.definition.name);
console.log('3. list_directory:', listDirectoryTool.definition.name);
console.log('4. update_file:', updateFileTool.definition.name);

// 测试类型
const testParams = {
  path: 'test.txt',
  content: 'test content',
  updates: [
    {
      operation: 'insert' as const,
      start_line_index: 1,
      insert_content: 'test'
    }
  ]
};

console.log('类型检查通过');