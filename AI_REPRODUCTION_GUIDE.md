# PulseHub AI 复现文档

这份文档的目标是让任何 AI 或新接手的开发者，在几乎不依赖口头说明的情况下，复现当前的 PulseHub 系统。

## 1. 系统一句话定义

PulseHub 是一个面向课堂讨论的实时协作系统。

- 教师端：注册、登录、创建讨论、开启/暂停/重置计时、查看各组提交、选择分享内容、进入分享视图。
- 学生端：通过 join link 进入讨论、填写姓名/组名/组人数、提交 Markdown 卡片，可附带图片或文档。
- 实时同步：通过 Socket.IO 把讨论状态、计时器、卡片提交、分享选择同步到所有已加入该讨论房间的客户端。

## 2. 当前技术栈

- 前端：React 18 + Vite + React Router
- 编辑器/渲染：`@uiw/react-md-editor` + `react-markdown` + `remark-gfm`
- 网络请求：Axios
- 实时通信：Socket.IO Client / Flask-SocketIO
- 后端：Flask 3
- 数据层：SQLAlchemy + SQLite
- 生产服务：Gunicorn + gevent-websocket + Nginx

## 3. 项目目录

```text
PulseHub/
├── README.md
├── TECHNICAL.md
├── AI_REPRODUCTION_GUIDE.md
└── Class Discussion Probe System/
    ├── backend/
    │   ├── app.py              # Flask API + Socket.IO 入口
    │   ├── models.py           # SQLAlchemy 数据模型 + SQLite 初始化/补字段
    │   ├── timer.py            # 计时器线程 + 讨论序列化
    │   ├── requirements.txt
    │   ├── probe.db            # 本地 SQLite 数据库
    │   └── uploads/            # 学生上传的图片/文档
    └── frontend/
        ├── package.json
        ├── vite.config.js      # 本地开发代理 /api 和 /socket.io
        ├── .env.example
        └── src/
            ├── App.jsx
            ├── api/client.js
            ├── hooks/
            ├── components/
            └── pages/
```

## 4. 核心业务模型

### 4.1 User

字段来源：`backend/models.py`

- `id`
- `name`
- `email`
- `password_hash`
- `created_at`

用途：

- 仅教师需要账号体系。
- 登录状态通过 Flask session cookie 保存。

### 4.2 Discussion

字段来源：`backend/models.py`

- `id`
- `owner_id`
- `title`
- `topic`
- `join_token`
- `groups`
- `group_sizes`
- `selected_groups`
- `is_hidden`
- `timer_duration`
- `timer_started_at`
- `timer_running`
- `discussion_ended`
- `created_at`

关键语义：

- `topic`：教师给学生看到的 Markdown 讨论题面。
- `join_token`：学生加入链接的唯一 token。
- `groups`：已加入过的组名数组，JSON 字符串存储。
- `group_sizes`：组名到组人数的映射，JSON 字符串存储。
- `selected_groups`：教师设置为“整组自动进入分享队列”的组名数组。
- `is_hidden`：逻辑删除，不做物理删除。
- `timer_duration`：剩余时长，单位秒。
- `timer_started_at` + `timer_running`：用于计算剩余时间。
- `discussion_ended`：倒计时结束后置为 `true`，学生不可继续提交。

### 4.3 Idea

字段来源：`backend/models.py`

- `id`
- `discussion_id`
- `group_id`
- `author_name`
- `content`
- `attachments`
- `submitted_at`
- `is_selected`
- `share_order`

关键语义：

- 一条 Idea 就是一张学生卡片。
- `content` 最多 300 字符。
- `attachments` 是 JSON 字符串，元素结构如下：

```json
{
  "name": "original-file-name.pdf",
  "url": "/api/uploads/<stored-name>",
  "kind": "image or document",
  "extension": "pdf"
}
```

- `is_selected=true` 表示被教师选入展示。
- `share_order` 控制分享顺序。

## 5. 页面与用户流

### 5.1 教师端路由

路由定义见 `frontend/src/App.jsx`

- `/`：首页
- `/login`：登录
- `/register`：注册
- `/dashboard`：教师工作台
- `/discussions/:id/manage`：讨论管理页
- `/discussions/:id/share`：分享展示页

### 5.2 学生端路由

- `/join/:token`：学生加入与提交页面

### 5.3 教师实际流程

1. 注册或登录。
2. 进入 Dashboard。
3. 创建 discussion，填写：
   - 标题 `title`
   - Markdown 题面 `topic`
   - 计时分钟数 `timer_minutes`
4. 系统生成 join URL：`/join/<join_token>`
5. 学生陆续进入后，教师在管理页看到组和卡片实时出现。
6. 教师可：
   - 启动/暂停/重置计时器
   - 修改标题和题面
   - 选中整组或单张卡片进入分享
   - 调整分享顺序
   - 打开分享视图
7. 倒计时归零后，讨论自动结束。

### 5.4 学生实际流程

1. 打开教师分享的 join URL。
2. 先填写：
   - `Your name`
   - `Group name`
   - `Group size`
3. 页面会把这 3 个值写入 `localStorage`，key 格式为：
   - `pulsehub-group-name:<token>`
   - `pulsehub-author-name:<token>`
   - `pulsehub-group-size:<token>`
4. 学生输入 Markdown 内容，可上传图片或文档。
5. 提交后卡片进入对应小组列表，并通过 Socket.IO 同步给教师端。
6. 如果讨论结束，学生仍能看历史内容，但不能继续提交。

## 6. 前后端契约

## 6.1 认证方式

- 教师认证基于 Flask session cookie。
- Axios 配置了 `withCredentials: true`。
- 前端通过 `GET /api/me` 判断是否已登录。

## 6.2 REST API

后端主文件：`backend/app.py`

### 认证

- `POST /api/auth/register`
  - 请求：`{ name, email, password }`
  - 约束：密码至少 6 位
- `POST /api/auth/login`
  - 请求：`{ email, password }`
- `POST /api/auth/logout`
- `GET /api/me`

### 教师讨论管理

- `GET /api/discussions`
  - 返回当前教师名下且 `is_hidden=false` 的讨论
- `POST /api/discussions`
  - 请求：`{ title, topic, timer_minutes }`
- `GET /api/discussions/:id`
- `PATCH /api/discussions/:id`
  - 可更新：
    - `title`
    - `topic`
    - `timer_duration`
    - `groups`
    - `group_sizes`
    - `selected_groups`
    - `timer_running`
    - `reset_timer`
    - `resume_discussion`
    - `restart_discussion`
    - `discussion_ended`
- `DELETE /api/discussions/:id`
  - 实际是逻辑删除：`is_hidden=true`

### 教师选择分享内容

- `POST /api/discussions/:id/groups/select`
  - 请求：`{ group_id, is_selected }`
  - 含义：整组卡片一起进入或移出分享队列
- `POST /api/discussions/:id/groups/set-selected-ideas`
  - 请求：`{ group_id, selected_idea_ids }`
  - 含义：对某组做“部分卡片选中”
- `PATCH /api/ideas/:id`
  - 请求可包含：
    - `is_selected`
    - `share_order`

### 学生端

- `GET /api/join/:token`
  - 返回 discussion 公开信息和已有 ideas
- `POST /api/join/:token/groups`
  - 请求：`{ group_id, group_size }`
  - 用于登记组名与组人数
- `POST /api/join/:token/ideas`
  - 支持 `application/json` 和 `multipart/form-data`
  - 字段：
    - `group_id`
    - `group_size`
    - `author_name`
    - `content`
    - `files`

### 文件访问与健康检查

- `GET /api/uploads/<filename>`
- `GET /health`

## 6.3 Socket.IO 事件

前端连接逻辑见 `frontend/src/hooks/useSocket.js`

客户端会在连接后发送：

- `join_session`
  - payload：`{ session_code: "<discussion.id>" }`

服务端使用 `discussion.id` 作为 Socket 房间号。

服务端广播事件：

- `session_updated`
  - 整个 discussion 的最新序列化结果
- `timer_update`
  - payload：`{ timer_running, seconds_remaining }`
- `idea_added`
  - 某张新卡片被提交
- `idea_updated`
  - 某张卡片的 `is_selected/share_order` 变化
- `discussion_ended`
  - 当前讨论结束，payload 为已选分享内容

## 7. 关键后端行为

### 7.1 文件上传规则

允许扩展名：

- 图片：`png` `jpg` `jpeg` `gif` `webp`
- 文档：`pdf` `docx` `pptx`

限制：

- 总请求体最大 25MB
- 非法扩展名会返回 400
- 文件最终保存在 `backend/uploads/`

### 7.2 计时器机制

计时逻辑位于 `backend/timer.py`

- 服务启动时调用 `start_timer_thread(app, socketio)`
- 后台线程每秒轮询一次所有 `timer_running=true` 的讨论
- 每秒向房间广播一次 `timer_update`
- 若剩余时间 <= 0：
  - `timer_running=false`
  - `discussion_ended=true`
  - 广播 `session_updated`
  - 广播 `discussion_ended`

### 7.3 数据库初始化与“自动补字段”

`init_db()` 会：

- `create_all()`
- 对旧表执行 `PRAGMA table_info`
- 如果缺列则 `ALTER TABLE` 补上：
  - `discussion_ideas.attachments`
  - `discussions.group_sizes`
  - `discussions.selected_groups`
  - `discussions.is_hidden`

这意味着当前项目是“轻迁移”方案，没有 Alembic。

## 8. 前端实现约束

### 8.1 API 基地址

见 `frontend/src/api/client.js`

- `VITE_API_URL` 存在时，Axios 直接请求该地址
- 否则使用空字符串，由 Vite dev proxy 代理 `/api` 和 `/socket.io`

### 8.2 Vite 开发代理

见 `frontend/vite.config.js`

- 默认代理目标：`http://127.0.0.1:5050`
- 代理：
  - `/api`
  - `/socket.io`
- Vite 监听 `0.0.0.0:5173`

### 8.3 本地时间显示

前端工具函数位于 `frontend/src/utils/discussion.js`

- 所有服务端时间默认按 UTC 解析
- 展示时统一格式化为 `Asia/Shanghai`

## 9. 本地复现步骤

## 9.1 环境要求

- Python 3.10+
- Node.js 18+
- npm 9+

## 9.2 启动后端

```bash
cd "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

默认地址：

- `http://127.0.0.1:5050`

首次启动会自动：

- 创建 `probe.db`
- 创建 `uploads/`
- 自动建表/补字段

## 9.3 启动前端

```bash
cd "/Users/qingshi/Desktop/Project/ClassDiscussion/PulseHub/Class Discussion Probe System/frontend"
npm install
cp .env.example .env
npm run dev
```

默认地址：

- `http://127.0.0.1:5173`

默认 `.env` 可保持：

```env
VITE_API_URL=
VITE_BACKEND_TARGET=http://127.0.0.1:5050
```

## 9.4 本地验收顺序

1. 打开教师端首页。
2. 注册教师账号。
3. 创建一个 discussion。
4. 复制 join link，在另一个浏览器窗口打开学生页。
5. 学生填写姓名、组名、组人数并提交卡片。
6. 返回教师管理页，确认：
   - 新组出现
   - 新卡片实时出现
   - 计时器可启动并同步刷新
7. 在教师端选中卡片或整组，打开 share view。
8. 等待计时结束，确认学生页停止提交且教师端收到结束状态。

## 10. 从零重新实现时必须保留的系统行为

如果一个 AI 要“重写一套功能等价系统”，至少必须保留以下行为：

1. 教师账号体系和 session 登录。
2. 讨论对象必须拥有 `title/topic/join_token/groups/group_sizes/selected_groups/timer`。
3. 学生必须通过 token 加入，不直接登录。
4. 学生提交必须支持：
   - Markdown 文本
   - 图片上传
   - PDF/DOCX/PPTX 上传
5. 小组维度必须独立存在，且要记录组人数。
6. 教师必须能按“整组”或“单张卡片”选择分享内容。
7. 分享顺序必须可排序，并在分享页面按顺序展示。
8. 计时器必须是服务端权威时钟，不能只靠前端本地倒计时。
9. 倒计时结束后必须广播结束事件，并阻止新增学生提交。
10. 教师端与学生端都必须通过实时连接获得讨论更新。

## 11. 生产部署现状

现有生产信息来自 `TECHNICAL.md`

- 公网地址：[http://111.230.243.180](http://111.230.243.180)
- 后端目录：`/home/ubuntu/class-discussion-app/backend`
- 前端静态目录：`/var/www/class-discussion-app/frontend`
- systemd：`/etc/systemd/system/class-discussion.service`
- nginx 配置：`/etc/nginx/sites-available/class-discussion`

Gunicorn 启动命令：

```bash
/home/ubuntu/class-discussion-app/backend/.venv/bin/gunicorn \
  -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
  -w 1 \
  -b 127.0.0.1:5050 \
  app:app
```

## 12. AI 接手时建议优先阅读的文件

按顺序阅读：

1. `README.md`
2. `TECHNICAL.md`
3. `Class Discussion Probe System/backend/app.py`
4. `Class Discussion Probe System/backend/models.py`
5. `Class Discussion Probe System/backend/timer.py`
6. `Class Discussion Probe System/frontend/src/App.jsx`
7. `Class Discussion Probe System/frontend/src/api/client.js`
8. `Class Discussion Probe System/frontend/src/pages/Dashboard.jsx`
9. `Class Discussion Probe System/frontend/src/pages/DiscussionManage.jsx`
10. `Class Discussion Probe System/frontend/src/pages/DiscussionShare.jsx`
11. `Class Discussion Probe System/frontend/src/pages/JoinDiscussion.jsx`

## 13. 最小复现结论

如果你是 AI，并且要复现当前系统，最短路径是：

1. 先按本文第 9 节启动前后端，确认现有系统可跑。
2. 用第 4、5、6、7、10 节理解业务模型与契约。
3. 若要重建新版本，优先保持 API 结构、Socket 事件名、Discussion/Idea 数据结构不变。
4. 若只需继续开发当前仓库，直接从 `backend/app.py` 和 `frontend/src/pages/DiscussionManage.jsx` 入手即可。

这份文档描述的是 2026-03-31 当前仓库中的实际实现，而不是理想化设计稿。
