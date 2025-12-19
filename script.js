// 全局变量
let githubToken = '';
const REPO_OWNER = 'Kacy1106'; // 替换成你的GitHub账号名
const REPO_NAME = 'file-share-website'; // 替换成你的仓库名
const UPLOAD_FOLDER = 'uploads/';
const MAX_FILE_SIZE = 80 * 1024 * 1024; // 80MB

// DOM元素
const loginBtn = document.getElementById('login-btn');
const githubTokenInput = document.getElementById('github-token');
const loginStatus = document.getElementById('login-status');
const uploadSection = document.querySelector('.upload-section');
const fileUpload = document.getElementById('file-upload');
const fileError = document.getElementById('file-error');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const fileList = document.querySelector('.file-list');
const fileContainer = document.getElementById('file-container');

// 1. 登录验证
loginBtn.addEventListener('click', async () => {
    githubToken = githubTokenInput.value.trim();
    if (!githubToken) {
        loginStatus.className = 'error';
        loginStatus.textContent = '请输入GitHub PAT！';
        return;
    }

    // 验证Token是否有效
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const user = await response.json();
            loginStatus.className = 'success';
            loginStatus.textContent = `登录成功！欢迎 ${user.login}`;
            // 显示上传和文件列表区域
            uploadSection.style.display = 'block';
            fileList.style.display = 'block';
            // 加载文件列表
            loadFileList();
        } else {
            loginStatus.className = 'error';
            loginStatus.textContent = 'Token无效，请检查！';
        }
    } catch (error) {
        loginStatus.className = 'error';
        loginStatus.textContent = '登录失败：' + error.message;
    }
});

// 2. 上传文件
uploadBtn.addEventListener('click', async () => {
    const file = fileUpload.files[0];
    if (!file) {
        fileError.textContent = '请选择要上传的文件！';
        return;
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
        fileError.textContent = `文件大小超过80MB限制（当前${(file.size/1024/1024).toFixed(2)}MB）！`;
        return;
    }

    // 验证文件格式（允许的格式）
    const allowedExts = ['.docx', '.pptx', '.xlsx', '.jpg', '.png', '.cdr', '.zip', '.7z', '.rar'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(fileExt)) {
        fileError.textContent = `不支持的文件格式！仅允许：${allowedExts.join(', ')}`;
        return;
    }

    fileError.textContent = '';
    uploadStatus.className = 'success';
    uploadStatus.textContent = '正在上传文件...';

    try {
        // 读取文件为Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            // 去除Base64前缀（data:xxx;base64,）
            const base64Content = reader.result.split(',')[1];

            // 调用GitHub API上传文件
            const fileName = encodeURIComponent(file.name); // 处理中文文件名
            const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${UPLOAD_FOLDER}${fileName}`;

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Upload file: ${file.name}`,
                    content: base64Content
                })
            });

            if (response.ok) {
                uploadStatus.textContent = '文件上传成功！';
                fileUpload.value = ''; // 清空文件选择
                loadFileList(); // 重新加载文件列表
            } else {
                const error = await response.json();
                uploadStatus.className = 'error';
                uploadStatus.textContent = '上传失败：' + error.message;
            }
        };
    } catch (error) {
        uploadStatus.className = 'error';
        uploadStatus.textContent = '上传失败：' + error.message;
    }
});

// 3. 加载文件列表
async function loadFileList() {
    fileContainer.innerHTML = '<div>正在加载文件列表...</div>';
    try {
        const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${UPLOAD_FOLDER}`;
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const files = await response.json();
            if (files.length === 0 || (files.length === 1 && files[0].name === '.gitkeep')) {
                fileContainer.innerHTML = '<div>暂无上传的文件</div>';
                return;
            }

            // 渲染文件列表
            fileContainer.innerHTML = '';
            files.forEach(file => {
                if (file.name === '.gitkeep') return; // 跳过空目录标记文件
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <span>${decodeURIComponent(file.name)}</span>
                    <a href="${file.download_url}" target="_blank" download>下载</a>
                `;
                fileContainer.appendChild(fileItem);
            });
        } else {
            fileContainer.innerHTML = '<div class="error">加载文件列表失败</div>';
        }
    } catch (error) {
        fileContainer.innerHTML = `<div class="error">加载失败：${error.message}</div>`;
    }
}
