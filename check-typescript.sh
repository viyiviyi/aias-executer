#!/bin/bash

echo "检查TypeScript编译问题..."
echo "========================="

# 检查TypeScript编译
echo "1. 运行TypeScript编译检查..."
npx tsc --noEmit --strict

if [ $? -eq 0 ]; then
    echo "✅ TypeScript编译检查通过"
else
    echo "❌ TypeScript编译检查失败"
    echo ""
    echo "尝试修复常见问题..."
    
    # 检查未使用的导入
    echo ""
    echo "2. 检查未使用的导入..."
    find src -name "*.ts" -type f | while read file; do
        if grep -q "import.*from.*path" "$file" && ! grep -q "path\." "$file"; then
            echo "  ⚠️  $file: 可能未使用的 'path' 导入"
        fi
    done
    
    # 检查类型问题
    echo ""
    echo "3. 检查常见的类型问题..."
    find src -name "*.ts" -type f | while read file; do
        if grep -q "\.split(" "$file" && grep -q "fs\.readFile" "$file"; then
            echo "  ⚠️  $file: 可能需要指定encoding参数"
        fi
    done
    
    exit 1
fi

echo ""
echo "🎉 所有TypeScript文件编译检查通过！"