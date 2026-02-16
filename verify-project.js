const fs = require('fs');
const path = require('path');

console.log('验证 AIAS Executor 项目...');
console.log('========================\n');

// 检查关键文件
const requiredFiles = [
  'src/index.ts',
  'src/core/config.ts',
  'src/core/executor.ts',
  'src/core/tool-registry.ts',
  'src/tools/index.ts',
  'src/api/tools.ts',
  'package.json',
  'tsconfig.json'
];

console.log('1. 检查关键文件:');
let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} (缺失)`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ 关键文件缺失，项目不完整');
  process.exit(1);
}

console.log('\n✅ 所有关键文件都存在');

// 检查工具数量
console.log('\n2. 检查工具注册:');
const toolsIndex = fs.readFileSync('src/tools/index.ts', 'utf-8');
const toolCount = (toolsIndex.match(/toolRegistry\.registerTool/g) || []).length;
console.log(`   注册的工具数量: ${toolCount}`);

if (toolCount >= 10) {
  console.log('✅ 工具数量充足');
} else {
  console.log('⚠️  工具数量较少');
}

// 检查TypeScript配置
console.log('\n3. 检查TypeScript配置:');
if (fs.existsSync('tsconfig.json')) {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf-8'));
  if (tsconfig.compilerOptions?.strict) {
    console.log('✅ TypeScript严格模式已启用');
  } else {
    console.log('⚠️  TypeScript严格模式未启用');
  }
}

// 检查依赖
console.log('\n4. 检查项目依赖:');
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const deps = Object.keys(pkg.dependencies || {}).length;
  const devDeps = Object.keys(pkg.devDependencies || {}).length;
  console.log(`   生产依赖: ${deps} 个`);
  console.log(`   开发依赖: ${devDeps} 个`);
  
  // 检查关键依赖
  const requiredDeps = ['express', 'cors', 'helmet', 'uuid', 'axios'];
  const missingDeps = requiredDeps.filter(dep => !pkg.dependencies?.[dep]);
  
  if (missingDeps.length === 0) {
    console.log('✅ 所有关键依赖都存在');
  } else {
    console.log(`❌ 缺失依赖: ${missingDeps.join(', ')}`);
  }
}

console.log('\n🎉 项目验证完成！');
console.log('\n下一步:');
console.log('1. 安装依赖: npm install');
console.log('2. 构建项目: npm run build');
console.log('3. 启动服务: npm start');
console.log('\n或者运行: ./build-and-run.sh');