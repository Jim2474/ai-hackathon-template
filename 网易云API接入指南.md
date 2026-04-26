
# 网易云API接入指南

## 一、项目简介

网易云音乐 NodeJS 版 API（NeteaseCloudMusicApi）是一个开源的第三方接口项目，通过跨站请求伪造（CSRF）技术调用网易云音乐官方 API，提供了丰富的音乐相关功能接口。

**项目地址**：https://github.com/Binaryify/NeteaseCloudMusicApi

**官方文档**：https://binaryify.github.io/NeteaseCloudMusicApi/

---

## 二、环境准备

### 2.1 必需软件
- **Node.js** (推荐 v12 及以上版本)
- **Git** (用于克隆代码)
- **npm** 或 **yarn** (Node.js包管理器)

### 2.2 检查环境
在终端执行以下命令检查是否安装：

```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v

# 检查 Git 版本
git -v
```

---

## 三、快速开始（三种方式）

### 方式一：克隆仓库运行（推荐新手）

#### 步骤1：克隆项目
```bash
# 国内加速地址（推荐）
git clone https://gitcode.com/gh_mirrors/ne/NeteaseCloudMusicApiBackup

# 或者官方地址
git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git
```

#### 步骤2：进入项目目录
```bash
cd NeteaseCloudMusicApiBackup
# 或
cd NeteaseCloudMusicApi
```

#### 步骤3：安装依赖
```bash
npm install
```

#### 步骤4：启动服务
```bash
# 默认端口 3000
node app.js

# 自定义端口（Windows）
set PORT=4000 && node app.js

# 自定义端口（Mac/Linux）
PORT=4000 node app.js
```

#### 步骤5：验证启动
打开浏览器访问：`http://localhost:3000`，如果看到文档页面说明启动成功！

---

### 方式二：使用 npx 一键运行（最简单）

直接在终端执行：
```bash
npx NeteaseCloudMusicApi
```

此命令会自动安装依赖并运行，默认端口 3000。

---

### 方式三：Docker 容器运行

```bash
# 拉取镜像
docker pull binaryify/netease_cloud_music_api

# 运行容器
docker run -d -p 3000:3000 binaryify/netease_cloud_music_api
```

---

## 四、常用接口示例

### 4.1 搜索接口
**接口地址**：`/search`

**请求示例**：
```
GET http://localhost:3000/search?keywords=周杰伦&limit=10
```

**参数说明**：
- `keywords`: 搜索关键词（必填）
- `limit`: 返回数量，默认 30（可选）
- `offset`: 偏移数量，默认 0（可选）
- `type`: 搜索类型，1=单曲，10=专辑，100=歌手，1000=歌单（可选）

---

### 4.2 获取歌单详情
**接口地址**：`/playlist/detail`

**请求示例**：
```
GET http://localhost:3000/playlist/detail?id=24381616
```

**参数说明**：
- `id`: 歌单ID（必填）

---

### 4.3 获取音乐URL
**接口地址**：`/song/url`

**请求示例**：
```
GET http://localhost:3000/song/url?id=33894312
```

**参数说明**：
- `id`: 音乐ID（必填，多个用逗号隔开）
- `br`: 码率，默认 999000（可选）

---

### 4.4 获取歌词
**接口地址**：`/lyric`

**请求示例**：
```
GET http://localhost:3000/lyric?id=33894312
```

---

### 4.5 获取热门搜索
**接口地址**：`/search/hot/detail`

**请求示例**：
```
GET http://localhost:3000/search/hot/detail
```

---

### 4.6 获取轮播图
**接口地址**：`/banner`

**请求示例**：
```
GET http://localhost:3000/banner
```

---

## 五、登录相关

### 5.1 二维码登录（推荐）
二维码登录需要三个步骤：

#### 步骤1：生成二维码Key
```
GET http://localhost:3000/login/qr/key?timestamp=123456
```

#### 步骤2：生成二维码
```
GET http://localhost:3000/login/qr/create?key=xxx&qrimg=true&timestamp=123456
```

#### 步骤3：检测扫码状态
```
GET http://localhost:3000/login/qr/check?key=xxx&timestamp=123456
```

**状态码说明**：
- 800: 二维码过期
- 801: 等待扫码
- 802: 待确认
- 803: 授权登录成功（会返回cookies）

---

### 5.2 手机验证码登录
```
GET http://localhost:3000/login/cellphone?phone=13xxx&captcha=1234
```

---

## 六、前端调用示例

### 6.1 使用 Fetch API

```javascript
// 搜索歌曲
fetch('http://localhost:3000/search?keywords=海阔天空')
  .then(response => response.json())
  .then(data => {
    console.log('搜索结果:', data);
  })
  .catch(error => {
    console.error('请求错误:', error);
  });
```

---

### 6.2 使用 Axios

```javascript
import axios from 'axios';

// 获取歌单详情
async function getPlaylist(id) {
  try {
    const response = await axios.get('http://localhost:3000/playlist/detail', {
      params: { id }
    });
    console.log('歌单详情:', response.data);
    return response.data;
  } catch (error) {
    console.error('请求失败:', error);
  }
}
```

---

### 6.3 跨域请求配置
如果是跨域请求，需要配置凭据：

```javascript
// Fetch API
fetch(url, {
  credentials: 'include'
});

// Axios
axios.get(url, {
  withCredentials: true
});
```

---

## 七、常见问题

### 7.1 端口被占用
**问题**：启动时提示端口已被占用

**解决**：使用其他端口启动
```bash
# Windows
set PORT=4000 && node app.js

# Mac/Linux
PORT=4000 node app.js
```

---

### 7.2 460 cheating 错误
**问题**：在国外服务器或部分国内云服务上使用报错

**解决**：添加 `realIP` 参数，传入国内IP
```
GET http://localhost:3000/song/url?id=xxx&realIP=116.25.146.177
```

---

### 7.3 301 错误
**问题**：调用需要登录的接口时报错

**解决**：先登录获取cookie，或等待缓存过期（2分钟），或添加时间戳参数
```
GET http://localhost:3000/xxx?timestamp=123456789
```

---

### 7.4 获取不到完整歌曲URL
**问题**：返回的是试听片段

**说明**：未登录状态或非会员账号只能获取试听片段，完整歌曲需要登录会员账号。

**替代方案**：可以使用外链方式
```
https://music.163.com/song/media/outer/url?id=歌曲ID.mp3
```

---

## 八、注意事项

1. **仅供学习使用**：本项目仅供学习交流，请勿用于商业用途，尊重版权。

2. **不要频繁调用**：避免频繁调用登录接口，否则可能触发风控。

3. **缓存机制**：接口有2分钟缓存，如需实时数据可添加时间戳参数。

4. **安全问题**：不要使用他人提供的公开服务，以免账号密码泄露。

5. **国外访问限制**：网易限制了部分地区访问，需要配置 `realIP` 参数。

---

## 九、部署到云端（可选）

### 9.1 Vercel 部署（免费）
1. Fork 项目到你的 GitHub
2. 访问 https://vercel.com
3. 点击 New Project → Import Git Repository
4. 选择你 fork 的项目
5. 点击 Deploy 等待完成

**注意**：Vercel 部署的接口需要额外加 `realIP` 参数。

---

## 十、更多功能

项目提供了数百个接口，包括但不限于：
- 用户信息管理
- 歌单操作
- 歌曲播放
- 评论功能
- 电台功能
- MV播放
- 推荐系统
- 年度听歌报告
- 等等...

详细接口文档请访问：https://binaryify.github.io/NeteaseCloudMusicApi/

---

## 十一、快速测试

服务启动后，可以访问以下页面测试：
- API文档：`http://localhost:3000`
- 测试页面：`http://localhost:3000/test.html`
- 二维码登录测试：`http://localhost:3000/qrlogin.html`

---

## 十二、黑客松建议

对于黑客松项目，建议：
1. 使用本地运行方式，简单快速
2. 先实现核心功能（搜索、播放）
3. 登录功能可以后加，先用游客模式
4. 注意接口调用频率，避免被封
5. 重点展示用户体验和创意

祝项目顺利！🎉
