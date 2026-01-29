phina.globalize();

phina.define('GameScene', {
    superClass: 'DisplayScene',
    init: function(param/*{}*/) {
        this.superInit(param);

        const self = this;

        this.backgroundColor = "black";

        // 定数 --------------------------
        const BOARD_SIZE = 9;
        const SPACE = 0;
        const BLACK = 1;
        const WHITE = 2;
        const OUT = 3;

        // 変数 --------------------------
        let move = 1;   // 手数
        let black_prisoner = 0; // 黒アゲハマ
        let white_prisoner = 0; // 白アゲハマ
        let ko_x = 0;   // コウの位置X
        let ko_y = 0;   // コウの位置Y
        let ko_num = 0; // コウが発生した手数
        let checkBoard = Array(BOARD_SIZE + 2); // 合法手かどうか調べるのに使う
        let nextColor = BLACK;

        let uttegaeshi_x = 0;
        let uttegaeshi_y = 0;

        this.enemies = [];
        this.timer = 0;

        this.points = 0;

        let lastDamage = 0;
        let killCount = 0;

        this.gameOver = false;

        self.baseLayer = RectangleShape({
            fill: "transparent",
            strokeWidth: 0,
            width: this.width,
            height: this.height,
        }).addChildTo(this).setPosition(0, 0);

        createGoban(BOARD_SIZE);

        createTapArea();

        self.animationLayer = RectangleShape({
            fill: "transparent",
            strokeWidth: 0,
            width: self.width,
            height: self.height,
        }).addChildTo(self).setPosition(self.gridX.center(), self.gridY.center());

        self.deadLine = RectangleShape({
            fill: "green",
            strokeWidth: 0,
            width: self.animationLayer.width,
            height: 10,
        }).setPosition(0, -130).addChildTo(self.animationLayer);

        createEnemy = function() {
            let hp;
            if (killCount < 5) {
                hp = 1;
            } else if (killCount < 15) {
                hp = Math.randint(1, 2);
            } else {
                hp = Math.randint(1, 3);
            }
            const enemy = Sprite("enemy" + hp).addChildTo(self.animationLayer);
            const xrange = self.animationLayer.width / 2 - enemy.width / 2;
            const x = Math.floor(Math.random() * xrange) - xrange / 2;
            enemy.setPosition(x, -1 * self.animationLayer.height / 2 + enemy.height);
            self.enemies.push({splite:enemy, hp: hp});
        }
        createEnemy();

        self.createEnemy = createEnemy;

        const pointLabel = LabelArea({
            text: "SCORE: 0",
            fontSize: 32,
            fontWeight: "bold",
            fill: "white",
            height: 30,
            width: self.width,
            align: "right",
            x: self.gridX.center(),
            y: self.gridY.center(-7.5),
        }).addChildTo(self.baseLayer);

        function updatePointLabel() {
            pointLabel.text = "SCORE: " + self.points;
        }


        // 碁盤
        const board = [];

        initBoard();

        /*------------------------------------------------------------------*/
        /* 座標(x,y)のcolor石を碁盤から取り除き、取った石の数を返す         */
        /*------------------------------------------------------------------*/
        function doRemoveStone(color, x, y, prisoner) {

            /* 取り除かれる石と同じ色ならば石を取る */
            if (board[y][x] === color) {

                // 攻撃のアニメーション
                atackAnimation(x, y);

                /* 取った石の数を１つ増やす */
                prisoner++;

                /* その座標に空点を置く */
                board[y][x] = SPACE;

                /* 左を調べる */
                if( x > 1 ){
                    prisoner = doRemoveStone( color, x-1, y, prisoner );
                }
                /* 上を調べる */
                if( y > 1 ){
                    prisoner = doRemoveStone( color, x, y-1, prisoner );
                }
                /* 右を調べる */
                if( x < (BOARD_SIZE) ){
                    prisoner = doRemoveStone( color, x+1, y, prisoner );
                }
                /* 下を調べる */
                if( y < (BOARD_SIZE) ){
                    prisoner = doRemoveStone( color, x, y+1, prisoner );
                }
            }

            /* 取った石の数を返す */
            return prisoner;
        }

        /*------------------------------------------------------------------*/
        /* チェック用の碁盤をクリア                                         */
        /*------------------------------------------------------------------*/
        function clearCheckBoard() {

            let x, y;

            for( y = 1; y < (BOARD_SIZE + 2 - 1); y++ ) {
                checkBoard[y] = [];
                for( x = 1; x < (BOARD_SIZE + 2 - 1); x++ ) {
                    checkBoard[y][x] = false;
                }
            }
        }        

        /*------------------------------------------------------------------*/
        /* 座標(x,y)にあるcolor石が相手に囲まれているか調べる               */
        /* 空点があればFALSEを返し、空点がなければTRUEを返す */
        /*------------------------------------------------------------------*/
        function doCheckRemoveStone(color,x,y )
        {
            let rtn;

            /* その場所は既に調べた点ならおしまい */  
            if( checkBoard[y][x] === true ){
                return true;
            }
            
            /* 調べたことをマークする */
            checkBoard[y][x] = true;

            /* 何も置かれていないならばおしまい */
            if( board[y][x] === SPACE ){
                return false;
            }

            /* 同じ色の石ならばその石の隣も調べる */  
            if( board[y][x] === color ){

                /* その石の左(x-1,y)を調べる */
                if ( x > 1 ) {
                    rtn = doCheckRemoveStone( color, x-1, y );
                    if( rtn === false ){
                        return false;
                    }
                }

                /* その石の上(x,y-1)を調べる */
                if ( y > 1 ){
                    rtn = doCheckRemoveStone( color, x, y-1 );
                    if( rtn === false ){
                        return false;
                    }
                }

                /* その石の右(x+1,y)を調べる */
                if ( x < (BOARD_SIZE) ){
                    rtn = doCheckRemoveStone( color, x+1, y );
                    if( rtn === false ){
                        return false;
                    }
                }

                /* その石の下(x,y+1)を調べる */
                if ( y < (BOARD_SIZE) ){
                    rtn = doCheckRemoveStone( color, x, y+1 );
                    if( rtn === false ){
                        return false;
                    }
                }
            }

            /* 相手の色の石があった */  
            return true;
        }

        /*------------------------------------------------------------------*/
        /* 座標(x,y)の石が死んでいれば碁盤から取り除く                      */
        /*------------------------------------------------------------------*/
        function removeStone(color, x, y)
        {

            let prisoner;  /* 取り除かれた石数 */

            /* 置いた石と同じ色なら取らない */
            if( board[y][x] === color ){
                return 0;
            }

            /* 空点なら取らない */
            if( board[y][x] === SPACE ){
                return 0;
            }

            /* マークのクリア */
            clearCheckBoard();

            /* 囲まれているなら取る */
            if (doCheckRemoveStone(board[y][x], x, y) === true) {
                prisoner = doRemoveStone(board[y][x], x, y, 0);
                return prisoner;
            }

            return 0;
        }

        // 碁盤に石を置く
        function setStone(color, x, y) {

            let prisonerN = 0;      /* 取り除かれた石の数（上） */
            let prisonerE = 0;      /* 取り除かれた石の数（右） */
            let prisonerS = 0;      /* 取り除かれた石の数（下） */
            let prisonerW = 0;      /* 取り除かれた石の数（左） */
            let prisonerAll = 0;    /* 取り除かれた石の総数 */
            let koFlag = false;     /* 劫かどうか */

            let uttegaeshi = false; /* ウッテガエシかどうか */

            if (uttegaeshi_x === x && uttegaeshi_y === y) {
                // alert("ウッテガエシ！");
                uttegaeshi = true;
            } else {
                uttegaeshi_x = 0;
                uttegaeshi_y = 0;
            }

            /* 座標(x,y)に石を置く */
            board[y][x] = color;

            /* 置いた石の隣に同じ色の石はあるか？ */
            if( board[y + 1][x] !== color &&
                board[y - 1][x] !== color &&
                board[y][x + 1] !== color &&
                board[y][x - 1] !== color ){
                /* 同じ色の石がないならば劫かもしれない */
                koFlag = true;
            } else {
                /* 同じ色の石があるならば劫ではない */
                koFlag = false;
            }

            /* 置いた石の周囲の相手の石が死んでいれば碁盤から取り除く */
            if (y > 1) {
                prisonerN = removeStone(color, x, y - 1);
            }
            if (x > 1) {
                prisonerW = removeStone(color, x - 1, y);
            }
            if (y < BOARD_SIZE) {
                prisonerS = removeStone(color, x, y + 1) ;
            }
            if (x < BOARD_SIZE) {
                prisonerE = removeStone(color, x + 1, y) ;
            }

            /* 取り除かれた石の総数 */
            prisonerAll = prisonerN + prisonerE + prisonerS + prisonerW;

            // ウッテガエシになるかもしれない
            if (prisonerAll === 1) {
                if (prisonerN === 1) {
                    uttegaeshi_x = x;
                    uttegaeshi_y = y - 1;
                } else if (prisonerW === 1) {
                    uttegaeshi_x = x - 1;
                    uttegaeshi_y = y;
                } else if (prisonerS === 1) {
                    uttegaeshi_x = x;
                    uttegaeshi_y = y + 1;
                } else if (prisonerE === 1) {
                    uttegaeshi_x = x + 1;
                    uttegaeshi_y = y;
                }
            }

            /* 置いた石の隣に同じ色の石がなく、取り除かれた石も１つならば劫 */
            if (koFlag === true && prisonerAll === 1){

                /* 劫の発生した手数を覚える */
                ko_num = move;

                /* 劫の座標を覚える */
                if (prisonerE === 1) {
                    /* 取り除かれた石が右 */
                    ko_x = x + 1;
                    ko_y = y;
                } else if (prisonerS === 1) {
                    /* 取り除かれた石が下 */
                    ko_x = x;
                    ko_y = y + 1;
                } else if (prisonerW === 1) {
                    /* 取り除かれた石が左 */
                    ko_x = x - 1;
                    ko_y = y;
                } else if (prisonerN === 1){
                    /* 取り除かれた石が上 */
                    ko_x = x;
                    ko_y = y - 1;
                }
            }

            // ダメージポイントのアニメーション
            damagePointAnimation(prisonerAll);
            lastDamage = prisonerAll;
            if (uttegaeshi) {
                flashGoban();
                initBoard();
                uttegaeshi_x = 0;
                uttegaeshi_y = 0;
            }

        }

        // 合法手かどうか調べる
        function checkLegal(color, x, y) {

            // 空点じゃないと置けません
            if (board[y][x] !== SPACE){
                console.log("空点じゃないと置けません", board[y][x]);
                return false;
            }

            /* 一手前に劫を取られていたら置けません */
            if (move > 1) {
                if(ko_x === x && ko_y === y && ko_num === (move - 1)){
                    console.log("一手前に劫を取られていたら置けません", board[y][x]);
                    return false;
                }
            }

            /* 自殺手なら置けません */
            if (checkSuicide( color, x, y ) === true) {
                console.log("自殺手なら置けません", board[y][x]);
                return false;
            }

            return true;

        }

        /*------------------------------------------------------------------*/
        /* 自殺手かどうか調べる                                             */
        /*------------------------------------------------------------------*/
        function checkSuicide(color, x, y )
        {

            let rtnVal;
            let opponent = color === BLACK ? WHITE : BLACK;  /* 相手の色 */

            /* 仮に石を置く */
            board[y][x] = color;

            /* マークのクリア */
            clearCheckBoard();

            /* その石は相手に囲まれているか調べる */
            rtnVal = doCheckRemoveStone(color, x, y );

            /* 囲まれているならば自殺手の可能性あり */
            if ( rtnVal === true ) {

                /* その石を置いたことにより、隣の相手の石が取れるなら自殺手ではない */
                if( x > 1 ){
                    /* 隣は相手？ */
                    if( board[y][x-1] === opponent ) {
                        /* マークのクリア */
                        clearCheckBoard();
                        /* 相手の石は囲まれているか？ */
                        rtnVal = doCheckRemoveStone( opponent, x - 1, y );
                        /* 相手の石を取れるので自殺手ではない */
                        if( rtnVal == true ){
                            /* 盤を元に戻す */
                            board[y][x] = SPACE;
                            return false;
                        }
                    }
                }

                if( y > 1 ){
                    /* 隣は相手？ */
                    if( board[y-1][x] === opponent ){
                        /* マークのクリア */
                        clearCheckBoard();
                        /* 相手の石は囲まれているか？ */
                        rtnVal = doCheckRemoveStone( opponent, x, y-1 );
                        /* 相手の石を取れるので自殺手ではない */
                        if( rtnVal == true ){
                            /* 盤を元に戻す */
                            board[y][x] = SPACE;
                            return false;
                        }
                    }
                }

                if( x < BOARD_SIZE ){
                    /* 隣は相手？ */
                    if( board[y][x+1] == opponent ){
                        /* マークのクリア */
                        clearCheckBoard();
                        /* 相手の石は囲まれているか？ */
                        rtnVal = doCheckRemoveStone( opponent, x+1, y );
                        /* 相手の石を取れるので自殺手ではない */
                        if( rtnVal == true ){
                            /* 盤を元に戻す */
                            board[y][x] = SPACE;
                            return false;
                        }
                    }
                }

                if( y < BOARD_SIZE ){
                    /* 隣は相手？ */
                    if( board[y+1][x] == opponent ){
                        /* マークのクリア */
                        clearCheckBoard();
                        /* 相手の石は囲まれているか？ */
                        rtnVal = doCheckRemoveStone( opponent, x, y+1 );
                        /* 相手の石を取れるので自殺手ではない */
                        if( rtnVal == true ){
                            /* 盤を元に戻す */
                            board[y][x] = SPACE;
                            return false;
                        }
                    }
                }

                /* 盤を元に戻す */
                board[y][x] = SPACE;

                /* 相手の石を取れないなら自殺手 */
                return true;

            } else {

                /* 盤を元に戻す */
                board[y][x] = SPACE;

                /* 囲まれていないので自殺手ではない */
                return false;
            }
        }


        // 碁盤を初期化
        function initBoard() {
            for (let y = 0; y < BOARD_SIZE + 2; y++) {
                board[y] = [];
                for (let x = 0; x < BOARD_SIZE + 2; x++) {
                    board[y][x] = SPACE;
                }
            }
            for (let y = 0; y < BOARD_SIZE + 2; y++) {
                board[y][0] = OUT;
                board[y][BOARD_SIZE + 2 - 1] = OUT;
                board[0][y] = OUT;
                board[BOARD_SIZE + 2 - 1][y] = OUT;
            }
        }

        // 盤面を表示する
        function showAllStones() {

            let cont = 0;

            self.banLayer.children.clear();

            for (let y = 1; y < BOARD_SIZE + 1; y++) {
                for (let x = 1; x < BOARD_SIZE + 1; x++) {
                    if (board[y][x] === BLACK) {
                        drawStone("black", x - 1, y - 1, true);
                        cont++;
                    } else if (board[y][x] === WHITE) {
                        drawStone("white", x - 1, y - 1, true);
                        cont++;
                    }
                }
            }

            return cont;
        }

        // 碁盤を一瞬光らせる
        function flashGoban() {
            const flash = RectangleShape({
                fill: "yellow",
                width: self.ban.width,
                height: self.ban.height,
                strokeWidth: 0,
            }).addChildTo(self.baseLayer).setPosition(self.gridX.center(), self.gridY.center(3));
            flash.tweener.to({alpha: 0}, 1000, "easeOutCirc").call(() => { flash.remove(); }).play();
        }

        // 碁盤を描画
        function createGoban(size) {

            // 外枠
            self.ban = RectangleShape({
                fill: "trancparent",
                width: 630,
                height: 630,
                strokeWidth: 0,
            }).addChildTo(self.baseLayer).setPosition(self.gridX.center(), self.gridY.center(3));
            const grid = Grid({width: self.ban.width - ((19 - size) * 6 + 50), columns: size - 1});

            const floor = Math.floor(size / 2);
            (size).times(function(spanX) {
                var startPoint = Vector2((spanX - floor) * grid.unitWidth, -1 * grid.width / 2),
                    endPoint = Vector2((spanX - floor) * grid.unitWidth, grid.width / 2);
        
                let strokeWidth = size === 9 ? 1 : 1.5;
                if (spanX === 0 || spanX === size - 1) {
                    strokeWidth = strokeWidth * 1.5;
                }
                PathShape({paths:[startPoint, endPoint], stroke: "white", strokeWidth: strokeWidth}).addChildTo(self.ban);
            });
        
            (size).times(function(spanY) {
                var startPoint = Vector2(-1 * grid.width / 2, (spanY - floor) * grid.unitWidth),
                    endPoint = Vector2(grid.width / 2, (spanY - floor) * grid.unitWidth);
                
                let strokeWidth = size === 9 ? 1 : 1.5;
                if (spanY === 0 || spanY === size - 1) {
                    strokeWidth = strokeWidth * 1.5;
                }
                PathShape({paths:[startPoint, endPoint], stroke: "white", strokeWidth: strokeWidth}).addChildTo(self.ban);
            });

            if (size === 9) {
                addStar(2, 2);
                addStar(6, 2);
                addStar(4, 4);
                addStar(2, 6);
                addStar(6, 6);
            } else if (size === 13) {
                addStar(3, 3);
                addStar(9, 3);
                addStar(6, 6);
                addStar(3, 9);
                addStar(9, 9);
            } else if (size === 19) {
                addStar(3, 3);
                addStar(9, 3);
                addStar(15, 3);
                addStar(3, 9);
                addStar(9, 9);
                addStar(15, 9);
                addStar(3, 15);
                addStar(9, 15);
                addStar(15, 15);
            }

            function addStar(spanX, spanY) {
                CircleShape({
                    radius: 5,
                    fill: "white",
                    strokeWidth: 0,
                }).addChildTo(self.ban).setPosition((spanX - floor) * grid.unitWidth, (spanY - floor) * grid.unitWidth);
            }

            self.banLayer = RectangleShape({
                fill: "transparent",
                strokeWidth: 0,
                width: self.ban.width,
                height: self.ban.height,
            }).addChildTo(self.ban).setPosition(0, 0);

            self.banLayer.size = size;
            self.banLayer.grid = grid;

            self.tapLayer = RectangleShape({
                fill: "transparent",
                strokeWidth: 0,
                width: self.ban.width,
                height: self.ban.height,
            }).addChildTo(self.ban).setPosition(0, 0);

            return;
        }

        // 石を置くタップ領域を作成
        function createTapArea() {
            const size = self.banLayer.size;
            const floor = Math.floor(size / 2);

            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const area = CircleShape({
                        fill: "transparent",
                        radius: self.banLayer.grid.unitWidth / 2 - 2,
                        strokeWidth: 0,
                    });
                    area.addChildTo(self.tapLayer).setPosition(self.banLayer.grid.span(x - floor), self.banLayer.grid.span(y - floor));
                    area.setInteractive(true);
                    area.on("pointstart", () => {
                        const xx = x + 1;
                        const yy = y + 1;
                        // 合法手かどうか調べる
                        if (checkLegal(nextColor, xx, yy)) {
                            setStone(nextColor, xx, yy);
                            if (showAllStones() > 0) {
                                drawLastMarker(x, y);
                            }
                            nextColor = nextColor === BLACK ? WHITE : BLACK;
                            move += 1;
                        }
                    });
                }
            }
        }

        // 最終手に赤●を付ける
        function drawLastMarker(x, y) {
            const floor = Math.floor(self.banLayer.size / 2);

            const marker = CircleShape({
                fill: "darkred",
                radius: 8,
                strokeWidth: 0,
            });
            marker.addChildTo(self.banLayer).setPosition(self.banLayer.grid.span(x - floor), self.banLayer.grid.span(y - floor));
        };


        // 石を描画
        function drawStone(color, x, y, show) {
            const floor = Math.floor(self.banLayer.size / 2);

            const stone = CircleShape({
                fill: color,
                radius: self.banLayer.grid.unitWidth / 2 - 2,
                strokeWidth: color === "white" ? 2 : 6,
                stroke: "white",
                x: x,
                y, y,
            });
            stone.addChildTo(self.banLayer).setPosition(self.banLayer.grid.span(x - floor), self.banLayer.grid.span(y - floor));
        };

        // 指定した座標から玉が飛んでいくアニメーション
        function atackAnimation(fromX, fromY) {
            // 指定ざれた座標に玉を描画
            const floor = Math.floor(self.banLayer.size / 2);
            const tama = CircleShape({
                fill: "red",
                radius: self.banLayer.grid.unitWidth / 2 - 2,
                strokeWidth: 0,
            }).addChildTo(self.animationLayer).setPosition(
                self.banLayer.grid.span(fromX - floor) - self.banLayer.grid.unitWidth,
                self.banLayer.grid.span(fromY - floor) + 120);

            // 玉の飛び先は、Y座標が一番大きいenemyの位置
            const topEnemy = getTopEnemy();
            let toX = topEnemy.splite.x;
            let toY = topEnemy.splite.y;

            // self.animationLayer
            //     .tweener
            //     .by({x: 10}, 30).by({x: -10}, 30).by({x: 10}, 30).by({x: -10}, 30)
            //     .by({x: 10}, 30).by({x: -10}, 30).by({x: 10}, 30).by({x: -10}, 30)
            //     .play();

            tama.tweener
                .to({scaleX: 1.2, scaleY: 1.2}, 300, "easeOutCirc")
                .to({x: toX, y: toY, scaleX: 0.1, scaleY: 0.1}, 200, "easeInCirc")
                .call(() => {
                    tama.remove();
                }).play();
        }

        // 敵に与えたダメージ数のアニメーション
        function damagePointAnimation(damage) {

            if (damage === 0) {
                return;
            }

            const topEnemy = getTopEnemy();
            let toX = topEnemy.splite.x;
            let toY = topEnemy.splite.y;

            const damageLabel = Label({
                text: damage,
                fontSize: 50 + damage * 5,
                fontWeight: "bold",
                fill: "white",
                x: toX,
                y: toY,
            }).addChildTo(self.animationLayer).hide();

            damageLabel.tweener
                .wait(600)
                .call(() => {
                    damageLabel.show();
                    // topEnemyを削除する
                    if (removeTopEnemy(damage)) {
                        // 少し待ってから新しい敵を作る
                        setTimeout(() => {
                            self.createEnemy();
                        }, 500);
                    }
                })
                .by({y: -50}, 500, "easeOutCirc")
                .call(() => {
                    damageLabel.remove();
                }).play();
        }

        // Y座標が一番大きいenemyを返す
        function getTopEnemy() {
            let topEnemy = null;
            let maxY = -Infinity;
            self.enemies.forEach(enemy => {
                if (enemy.splite.y > maxY) {
                    maxY = enemy.splite.y;
                    topEnemy = enemy;
                }
            });
            return topEnemy;
        }

        // Y座標が一番大きいenemyを削除する
        function removeTopEnemy(damage) {
            const topEnemy = getTopEnemy();

            if (damage < topEnemy.hp) {
                return false;
            }
            const index = self.enemies.indexOf(topEnemy);
            if (index > -1) {
                self.enemies.splice(index, 1);
                topEnemy.splite.remove();
                self.points += lastDamage * 10;
                killCount += 1;
                updatePointLabel();

                // 爆発アニメーション
                const explosion = CircleShape({
                    fill: "orange",
                    radius: 10,
                    strokeWidth: 0,
                }).addChildTo(self.animationLayer).setPosition(topEnemy.splite.x, topEnemy.splite.y);
                explosion.tweener
                    .to({scaleX: 5, scaleY: 5, alpha: 0}, 800, "easeOutCirc")
                    .call(() => {
                        explosion.remove();
                    }).play();
            }
            return true;
        }

    },

    update: function() {
        const self = this;
        this.timer += 1;
        if (this.timer % 5 !== 0) {
        // if (this.timer % 1 !== 0) {
            return;
        }

        if (this.gameOver) {
            return;
        }

        // 全ての敵のY座標を1増やす
        this.enemies.forEach(enemy => {
            enemy.splite.y += 1;
        });

        // 敵がデッドラインを越えたらゲームオーバー
        this.enemies.forEach(enemy => {
            if (enemy.splite.hitTestElement(self.deadLine)) {
                self.deadLine.fill = "red";
                self.gameOver = true;
                // 碁盤を半透明にする
                self.ban.alpha = 0.2;
                setTimeout(() => {
                    App.pushScene(GameOverScene({score: self.points}));
                }, 1);
                self.one("resume", () => {
                    self.exit("TitleScene");
                });
            }
        });
    },

});

phina.define('GameOverScene', {
    superClass: 'DisplayScene',
    init: function(param/*{}*/) {
        this.superInit(param);

        const self = this;

        this.backgroundColor = "transparent";

        Label({
            text: "GAME OVER",
            fontSize: 100,
            fill: "white",
            fontWeight: "bold",
            stroke: "black",
            strokeWidth: 8,
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(-5));

        const hightScore = localStorage.getItem("invader_high_score", Math.max(param.score, localStorage.getItem("invader_high_score") || 0));

        if (param.score > hightScore) {
            localStorage.setItem("invader_high_score", param.score);
            Label({
                text: "HIGHT SCORE !!",
                fontSize: 60,
                fill: "red",
                fontWeight: "bold",
                stroke: "white",
                strokeWidth: 12,
            }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(-2.5));
            Label({
                text: param.score,
                fontSize: 120,
                fill: "red",
                fontWeight: "bold",
                stroke: "white",
                strokeWidth: 12,
            }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(-1));
        }

        // 戻るボタン
        const backButton = RectangleShape({
            width: 200,
            height: 60,
            fill: "white",
            strokeWidth: 0,
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(6));
        Label({
            text: "BACK",
            fontSize: 40,
            fill: "black",
            fontWeight: "bold",
        }).addChildTo(backButton).setPosition(0, 0);
        backButton.setInteractive(true);
        backButton.on("pointstart", function() {
            self.exit("TitleScene");
        });

    },
});

phina.define('TitleScene', {
    superClass: 'DisplayScene',
  
    init: function(options) {
        this.superInit(options);

        const self = this;

        this.backgroundColor = "black";

        Label({
            text: "囲碁\nインベーダー",
            fill: "white",
            fontWeight: 800,
            fontSize: 80,
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(-3));

        // ハイスコア表示
        const hightScore = localStorage.getItem("invader_high_score");
        if (hightScore > 0) {
            Label({
                text: "ハイスコア\n" + hightScore,
                fill: "white",    
                fontWeight: 800,
                fontSize: 40,
            }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(1));
        }

        // ヒント表示
        const hints = [
            "碁石を一度にたくさん消すと高得点だ！",
            "黒石と白石をバランスよく消そう！",
            "緑色の敵は、碁石を同時に２つ以上消せば倒せるぞ！",
            "黄色の敵は、碁石を同時に３つ以上消せば倒せるぞ！",
            "ウッテガエシで盤面をリセットできる！",
            "コウを利用すると有利に戦えるぞ！",
        ];
        // 表示するヒントをランダムに決定
        const hint = hightScore === null
            ? "侵略者が緑ラインまで到達する前に、碁石を消して攻撃しよう！"
            : hints[Math.floor(Math.random() * hints.length)];
        LabelArea({
            text: hint,
            fontSize: 24,
            fill: "white",
            fontWeight: "bold",
            stroke: "black",
            strokeWidth: 8,
            width: this.gridX.width * 0.7,
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(6));

        this.on("pointstart", function() {
            self.exit("GameScene");
        });

    },

});


ASSETS = {
    image: {
        "enemy1": "enemy1.png",
        "enemy2": "enemy2.png",
        "enemy3": "enemy3.png",
    }
};

phina.main(function() {
    App = GameApp({
        assets: ASSETS,
        startLabel: 'TitleScene',
        scenes: [
            {
                label: 'TitleScene',
                className: 'TitleScene',
            },
            {
                label: 'GameScene',
                className: 'GameScene',
            },
        ],
    });

    App.fps = 60;

    App.run();

});
