<template>
    <div>
        <div class="teaser">
            <div class="topBlock">
                <div class="textTeaser">
                    <h2 class="title">Tools for building json:api servers and services</h2>
                    <p class="text">
                        One stop shop for building and consuming JSON:API compliant
                        api servers and services. Setup Express or browser server in minutes,
                        and connect it to database of your preference.
                    </p>
                    <router-link class="ctaBtn" :to="'/about.html'">View documentation</router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.teaser {
    background: #f5f5f5;
    min-height: calc(100vh - 58px);
    display: flex; justify-content: center; align-items: center;
    background: #f5f5f5 url('/json-api-shop/logo-white.svg') no-repeat right -240px bottom -220px;
    background-size: 700px 700px;

    @media screen and (min-width: 720px) {
        min-height: 100vh; min-height: calc(100vh - 58px);
        background-position: right -370px bottom -945px;
        background-size: 1850px 1850px;
    }
}

.topBlock {
    position: relative; padding: 25px;

    @media screen and (min-width: 720px) {
        display: table;
        padding: 140px 40px 160px; max-width: 1100px; margin: 0 auto;
    }

}

.textTeaser {
    max-width: 600px; padding-bottom: 25px;

    > .title {
        font-size: 32px; margin: 0; position: relative;
        padding: 0 0 20px 0;
        letter-spacing: -0.015em;
        font-weight: bold;
        border: 0;
    }

    > .text {
        color: #585858; margin: 0;
    }

    @media screen and (min-width: 720px) {
        display: table-cell; padding-right: 35px; padding-top: 35px;
        vertical-align: middle;

        > .title {
            font-size: 46px;
        }
    }
}

.ctaBtn {
    display: inline-block; padding: 12px 20px;
    margin-top: 23px;
    border-radius: 25px; letter-spacing: -0.3px;
    background: #7485c2; color: #fff;
    transition: background-color 0.3s;

    &:hover, &:focus {
        background-color: darken(#7485c2, 5%);
        text-decoration: none !important;
    }
}

.screenshot {

    @media screen and (min-width: 720px) {
        width: 500px; display: table-cell;
        font-size: 0.77em;
    }
}
</style>
