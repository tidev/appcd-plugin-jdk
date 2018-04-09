# appcd-plugin-jdk

JDK service for the Appc Daemon.

## Info

The `info` service uses [jdklib](https://github.com/appcelerator/jdklib) to detect the installed
JDKs and returns the information.

```js
appcd.call('/jdk/latest/info', ctx => {
	console.log(ctx.response);
});
```

## Legal

This project is open source under the [Apache Public License v2][1] and is developed by
[Axway, Inc](http://www.axway.com/) and the community. Please read the [`LICENSE`][1] file included
in this distribution for more information.

[1]: https://github.com/appcelerator/appcd-plugin-jdk/blob/master/LICENSE
