## 本地开发

```sh
npm install
lerna bootstrap
lerna run watch --parallel | npm run watch
```

## 发布

```sh
git commit -am "chore: 提交信息"

npm run build && lerna publish
```