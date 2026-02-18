# update_file 工具新功能说明

## 概述

已对 `update_file` 工具进行了升级，新增了两个重要功能：
1. **基于原始行号的批量操作** - 所有操作都基于原始文件行号，而不是前一个操作后的行号
2. **变更块代码返回** - 操作后返回有变更的块代码，带行号，类似 `read_code` 响应的内容格式

## 新参数

### 1. `use_original_line_numbers` (可选，默认 `false`)
- **类型**: `boolean`
- **描述**: 是否所有操作都基于原始文件行号
- **默认值**: `false` (保持向后兼容)
- **当设置为 `true` 时**: 所有更新操作的行号都基于原始文件，工具会从后往前处理操作以避免行号冲突

### 2. `show_changed_blocks` (可选，默认 `false`)
- **类型**: `boolean`
- **描述**: 是否在响应中包含变更块代码
- **默认值**: `false` (保持响应简洁)
- **当设置为 `true` 时**: 每个应用的更新操作都会包含 `changed_block` 字段，格式与 `read_code` 工具一致

### 3. `line_number_format` (可选，默认 `'{line}│'`)
- **类型**: `string`
- **描述**: 变更块的行号格式
- **默认值**: `'{line}│'` (与 `read_code` 默认格式一致)
- **示例**: `'{line}│'`, `'[{line}] '`, `'{line}. '`

## 使用示例

### 示例1: 基于原始行号的批量操作

```json
{
  "path": "test.txt",
  "updates": [
    {
      "operation": "insert",
      "start_line_index": 3,
      "insert_content": "插入的第1行\n插入的第2行"
    },
    {
      "operation": "delete",
      "start_line_index": 5,
      "del_line_count": 1
    },
    {
      "operation": "insert",
      "start_line_index": 6,
      "insert_content": "最后插入的行"
    }
  ],
  "use_original_line_numbers": true
}
```

**说明**:
- 所有操作的行号都基于原始文件
- 第1个操作: 在原始文件的第3行前插入2行
- 第2个操作: 删除原始文件的第5行
- 第3个操作: 在原始文件的第6行前插入1行
- 工具会从后往前处理这些操作

### 示例2: 返回变更块代码

```json
{
  "path": "test.txt",
  "updates": [
    {
      "operation": "insert",
      "start_line_index": 2,
      "insert_content": "新插入的内容"
    }
  ],
  "show_changed_blocks": true,
  "line_number_format": "{line}│"
}
```

**响应示例**:
```json
{
  "path": "test.txt",
  "updates_applied": 1,
  "original_lines": 5,
  "new_lines": 6,
  "applied_updates": [
    {
      "operation": "insert",
      "start_line_index": 2,
      "details": {
        "operation": "insert",
        "start_line_index": 2,
        "inserted_lines": ["新插入的内容"],
        "inserted_line_count": 1,
        "actual_insert_position": 2
      },
      "changed_block": {
        "content": "2│新插入的内容",
        "total_lines": 1,
        "start_line": 2,
        "end_line": 2
      }
    }
  ]
}
```

### 示例3: 完整功能使用

```json
{
  "path": "code.py",
  "updates": [
    {
      "operation": "insert",
      "start_line_index": 10,
      "insert_content": "def new_function():\n    print('Hello')"
    },
    {
      "operation": "delete",
      "start_line_index": 15,
      "del_line_count": 3
    }
  ],
  "use_original_line_numbers": true,
  "show_changed_blocks": true,
  "line_number_format": "[{line}] "
}
```

## 工作原理

### 基于原始行号的处理逻辑

当 `use_original_line_numbers=true` 时：

1. **读取原始文件**，获取原始行数
2. **排序操作**：按行号降序排序（从后往前）
3. **从后往前处理**：
   - 先处理行号较大的操作
   - 再处理行号较小的操作
   - 这样前面的行号不会受后面操作的影响

**示例**:
```
原始文件: 5行
操作1: 在第3行插入 (原始行号3)
操作2: 删除第5行 (原始行号5)
操作3: 在第6行插入 (原始行号6)

处理顺序:
1. 操作3 (第6行插入)
2. 操作2 (第5行删除) 
3. 操作1 (第3行插入)
```

### 变更块生成逻辑

当 `show_changed_blocks=true` 时：

1. **对于插入操作**：返回插入的内容，带行号
2. **对于删除操作**：返回被删除的内容，带行号
3. **格式**：与 `read_code` 工具完全一致

## 向后兼容性

- **默认行为不变**：如果不设置新参数，工具行为与之前完全一致
- **渐进式升级**：可以逐步使用新功能，不影响现有代码
- **参数可选**：所有新参数都有合理的默认值

## 优势

1. **更直观的操作**：用户可以直接基于原始文件行号指定操作，无需计算偏移
2. **更好的调试信息**：变更块代码让用户清楚看到具体修改了哪些内容
3. **一致的体验**：变更块格式与 `read_code` 工具一致，用户体验统一
4. **灵活的格式**：支持自定义行号格式

## 注意事项

1. **行号冲突**：当 `use_original_line_numbers=true` 时，确保操作之间没有行号重叠
2. **性能影响**：返回变更块会增加响应大小，但通常影响很小
3. **错误处理**：如果某个操作失败，会停止执行后续操作并返回错误信息

## 测试验证

已通过多种场景测试验证：
- 基于原始行号的插入和删除操作
- 变更块代码生成
- 格式一致性验证
- 向后兼容性验证

## 总结

新的 `update_file` 工具提供了更强大、更直观的文件编辑功能，特别适合需要精确控制多位置修改的场景，同时提供了详细的修改反馈，便于调试和验证。