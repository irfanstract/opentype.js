

# CONTRIBUTING TO `VBunKit/code/XBunDotJsSrc`






## Before You Attempt To Run `npm install`...

OUTDATED

```diff
-     ,          "electron": "../../code/elw.log/node_modules/electron"
+     ,          "electron": "~41.5.0"
```

### was...

if you attempt `npm install` right away from [_checkout_](https://en.wikipedia.org/wiki/Source_control),
the command will fail with smthn like `ENOENT` or `ERR_PACKAGE_NOT_FOUND`...

this is expected.
among the things in `devDependencies` (in [`XB/package.json`](/code/XBunDotJsSrc/package.json)) is
a reference to `../../code/elw.log`,
absent in [_the git commit_](https://en.wikipedia.org/wiki/Source_control) due to [`/.gitignore`'s `*.log` rule](/.gitignore) (this is by design, to prevent `node_modules` from growing up too large in disk usage).
to fix it,
create directory `/code/elw.log`, create file `/code/elw.log/package.json` and initialise it to the following, and then run `npm install` there, then
retry the earlier, above `npm install`.

1.  ```
    K:/Dev/Repos/VBunKit1/code> mkdir elw.log
    ```

    ```
    K:/Dev/Repos/VBunKit1/code/elw.log> create-file package.json
    ```

    ```json
    {

      "scripts": {
      }

      ,
      "dependencies": {
        "electron": "~40.6.1"
      }

    }
    ```

2.  ```
    K:/Dev/Repos/VBunKit1/code/elw.log> npm install
    ```

3.  ```
    K:/Dev/Repos/VBunKit1/code/XBunDotJsSrc> npm install
    ```

**a much-simpler alternative, is to simply make the following one-line change in [`XB/package.json`](/code/XBunDotJsSrc/package.json), replacing such nebulous path reference with [a published version range](https://npmjs.com/package/electron?activeTab=versions), which, as depended by all the code in here, were `40.6` (better, complete with auto patch-upgrade with an '`~`' so we get `~40.6`). long-term, this is the only well-learnt way out; however, this has the consequence of putting in large download sizes (hundreds of MB(s)), which is sometimes unacceptable.**

```diff
-     ,          "electron": "../../code/elw.log/node_modules/electron"
+     ,          "electron": "~40.6.1"
```




## Considerations For Version Range Spec(s)

(talking about the `package.json`s)

for the top-level directory (the workspace as a whole, `XBunDotJsSrc`),
strive for the `~`-prefixed, 3-elem (both together to avoid breaking changes during development and tests) fmt, like `~19.2.7`

for anything other than that,
strive for the `^`-prefixed, <s>2-elem</s> 3-elem (both together to ease users of our libraries) fmt, like <s>`^19.2`</s> `^19.2.7`













