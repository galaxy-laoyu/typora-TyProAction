const fs = require('fs');
const path = require('path');
module.exports = async ({
    github,
    context,
    core,
    checkType,
    update_version,
    forceVersion,
    forceUpdate,
}) => {
    isDev = forceVersion ? forceVersion.endsWith('-dev') : checkType === 'dev';
    console.log(isDev ? '开发版' : '稳定版');
    update_version = forceVersion ? forceVersion : update_version;
    const exePath = path.resolve('Typro-update-V' + update_version + '.exe');
    const win64ConfigPath = path.resolve(
        `config/releases/${isDev ? 'dev_' : ''}windows_64.json`
    );
    const asarZip = path.resolve('asar-file-V' + update_version + '.zip');

    if (forceVersion) {
        console.log('手动更新');
        const list = await github.rest.repos.listTags({
            owner: context.repo.owner,
            repo: context.repo.repo,
        });
        if (update_version in list) {
            //tag已经存在
            const tagInfo = await github.rest.repos.getReleaseByTag({
                owner: context.repo.owner,
                repo: context.repo.repo,
                tag: 'v' + update_version,
            });
            // tagId更新
            const tempId = tagInfo.tag_name.split('_');
            if (tempId.length > 1) {
                tempId[1] = (Number('0x' + tempId[1]) + 1).toString(16);
            } else {
                tempId.push(Math.random().toString(16).slice(2,5));
            }
            //重命名-pre
            await github.rest.repos.updateRelease({
                owner: context.repo.owner,
                repo: context.repo.repo,
                release_id: tagInfo.id,
                tag: tempId.join('_'),
                name: tagInfo.name + '(已废弃)',
            });
        }
    }

    //发布新release
    const releaseInfo = await github.rest.repos.createRelease({
        owner: context.repo.owner,
        repo: context.repo.repo,
        tag_name: 'v' + update_version,
        name: 'v' + update_version,
        body:
            'TyproAction auto update success!\n\n- [x] Update time: ' +
            new Date().toUTCString(),
        prerelease: isDev,
    });
    console.log(releaseInfo);

    const assetInfo = await github.rest.repos.uploadReleaseAsset({
        owner: context.repo.owner,
        repo: context.repo.repo,
        release_id: releaseInfo.data.id,
        name: 'Typro-Update-V' + update_version + '.exe',
        data: fs.readFileSync(exePath),
    });
    console.log(assetInfo);

    const assetInfo2 = await github.rest.repos.uploadReleaseAsset({
        owner: context.repo.owner,
        repo: context.repo.repo,
        release_id: releaseInfo.data.id,
        name: 'asar-file-V' + update_version + '.zip',
        data: fs.readFileSync(asarZip),
    });
    console.log(assetInfo2);

    //更新json配置
    if (!(forceVersion && forceUpdate !== '1')) {
        const conf = JSON.parse(fs.readFileSync(win64ConfigPath));
        console.log(conf);
        conf.version = update_version;
        conf.download = assetInfo.data.browser_download_url;
        conf.downloadCN =
            'https://ghproxy.com/' + assetInfo.data.browser_download_url;
        if (isDev) conf.download = conf.downloadCN;
        fs.writeFileSync(win64ConfigPath, JSON.stringify(conf, '', 4));
    }
    //删除缓存文件
    fs.unlinkSync(exePath);
    fs.unlinkSync(asarZip);

    // 手动（其实是自动）更新CDN
    // 更新失败！ 谁爱更新谁更新去吧，不行就等第二天去
    // (╯‵□′)╯︵┻━┻
    //     console.log(
    //         (
    //             await github.request({
    //               method: "GET",
    //               url: `https://purge.jsdelivr.net/gh/taozhiyu/TyProAction@main/config/releases/${isDev?"dev_":""}windows_64.json`,
    //               headers: {
    //                   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
    //                   'Accept':'text/html,application/xhtm +xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //                   'Accept-Encoding':'gzip, deflate, sdch, br',
    //                   'Connection':'keep-alive',
    //               },
    //             })
    //         ).data
    //     );
    core.setOutput('commit_message', `update ${checkType} V${update_version}`);
};
