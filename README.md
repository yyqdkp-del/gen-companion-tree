# gen-companion-tree

## 数据库迁移

新增迁移文件放到 `supabase/migrations/`  
命名格式：`{timestamp}_{description}.sql`  
push 到 main 分支后自动执行

本地开发：

```bash
supabase db push
```
