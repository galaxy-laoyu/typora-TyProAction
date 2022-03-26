module.exports = async ({
  github,
  context,
  crypto,
  PRIVATE_KEY
}) => {
  async function endWithComment(words, isok) {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: words || '指令匹配错误\n\ncommand match error'
    });
    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      state: 'closed',
      labels: [isok ? '☑️keygen/注册机🎉' : '🤔invalid/无效的😒']
    });
    return;
  }
  function doenc (MachineCode,email,license){
    var mc=JSON.parse(Buffer.from(MachineCode,'base64').toString());
    var signInfo={fingerprint: mc.i, email , license, type: '1'};
    return JSON.stringify(signInfo);
  }
  if (context.payload.issue.title === 'keygen') {
    try {
      const info = context.payload.issue.body;
      const commMatch = info.replace(/\r/g, '').match(/<!--.+-->/s);

      if (commMatch) {
        const conf = commMatch[0].split('\n').filter(i => !i.match(/☑️|：|<!--|-->/));

        if (conf.length === 3) {
          const code=doenc(...conf);
          const key = crypto.privateEncrypt(PRIVATE_KEY, Buffer.from(code)).toString('base64');
          await endWithComment(`您的离线激活码为/Your offline activation code is:

\`+${key}\`

---
请先在release中下载并覆盖替换补丁文件

Please download and overwrite the patch in \`release\` first

最好在\`host\`中添加如下拦截，以防联网检测（懒，未删除该部分内容）

It is best to add the following interception to the \`host\` to prevent network detection (cause of lazy, this part of the content did not deleted)

\`\`\`
0.0.0.0 store.typora.io
0.0.0.0 dian.typora.com.cn
0.0.0.0 typora.com.cn
\`\`\``, true);
          return
        }
      }

      await endWithComment('无法正确匹配到配置信息\n\nCan not match the configuration information correctly.');
      return;
    } catch (error) {
      console.log(error)
      await endWithComment('激活码计算过程中发生错误\n\nAn error occurred during activation code calculation');
      return
    }
  } else {
    await endWithComment();
  }
};
