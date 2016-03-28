App = function()
{
    var ship;                   // the player ship
    var lastFireTime = 0;       // the last time the player fired a bullet
    var fireRate = 5;           // how many bullets per second to fire
    var nextEnemy;              // the process that will spawn the next enemy
    var enemyDelay;             // how long to wait from spawning one enemy to spawning the next one
    var activeBullets = [];     // a list of bullets we've fired and are still active
    var scoreCounter;           // an object to display the score
    var score;                  // the current score

    this.load = function()
    {
        wade.loadImage('images/ship.png');
        wade.loadImage('images/bullet.png');
        wade.loadImage('images/enemyBullet.png');
        wade.loadImage('images/enemy.png');
        wade.loadImage('images/boom.png');
        wade.loadImage('images/star.png');
    };

    this.init  = function()
    {
        wade.setMinScreenSize(708, 398);
        wade.setMaxScreenSize(708, 398);

        /*
        var backSprite = new Sprite(0, 11);
        backSprite.setSize(wade.getScreenWidth(), wade.getScreenHeight());
        backSprite.setDrawFunction(wade.drawFunctions.solidFill_('#f600f9'));
        var backObject = new SceneObject(backSprite);
        wade.addSceneObject(backObject);

        // create stars
        for (var i=0; i<15; i++)
        {
            var size = Math.random() * 24 + 24;
            var rotation = Math.random() * 6.28;
            var posX = (Math.random() - 0.5) * wade.getScreenWidth();
            var posY = (Math.random() - 0.5) * wade.getScreenHeight();
            var starSprite = new Sprite('images/star.png', 10);
            starSprite.setSize(size, size);
            var star = new SceneObject(starSprite, 0, posX, posY);
            star.setRotation(rotation);
            wade.addSceneObject(star);
            star.moveTo(posX, wade.getScreenHeight() / 2 + size / 2, 20);
            star.onMoveComplete = function()
            {
                var size = this.getSprite().getSize().y;
                var posX = (Math.random() - 0.5) * wade.getScreenWidth();
                this.setPosition(posX, -wade.getScreenHeight() / 2 - size / 2);
                this.moveTo(posX, wade.getScreenHeight() / 2 + size / 2, 20);
            };
        }
        */
        // load high score
        var shooterData = wade.retrieveLocalObject('shooterData');
        var highScore = (shooterData && shooterData.highScore) || 0;

        // main menu text
        var clickText = new TextSprite('Click or tap to start', '32px Verdana', 'white', 'center');
        clickText.setDrawFunction(wade.drawFunctions.blink_(0.5, 0.5, clickText.draw));
        var clickToStart = new SceneObject(clickText);
        clickToStart.addSprite(new TextSprite('Your best score is ' + highScore, '18px Verdana', 'yellow', 'center'), {y: 30});
        wade.addSceneObject(clickToStart);
        wade.app.onMouseDown = function()
        {
            wade.removeSceneObject(clickToStart);
            wade.app.startGame();
            wade.app.onMouseDown = 0;
        };
    };

    this.startGame = function()
    {
        var sprite = new Sprite('images/ship.png');
        var mousePosition = wade.getMousePosition();
        ship = new SceneObject(sprite, 0, mousePosition.x, mousePosition.y);
        wade.addSceneObject(ship);

        wade.setMainLoopCallback(function()
        {
            var nextFireTime = lastFireTime + 1 / fireRate;
            var time = wade.getAppTime();
            if (wade.isMouseDown() && time >= nextFireTime)
            {
                lastFireTime = time;
                var shipPosition = ship.getPosition();
                var shipSize = ship.getSprite().getSize();
                var sprite = new Sprite('images/bullet.png');
                var bullet = new SceneObject(sprite, 0, shipPosition.x, shipPosition.y - shipSize.y / 2);
                wade.addSceneObject(bullet);
                activeBullets.push(bullet);
                bullet.moveTo(shipPosition.x, -500, 600);
                bullet.onMoveComplete = function()
                {
                    wade.removeSceneObject(this);
                    wade.removeObjectFromArray(this, activeBullets);
                };
            }

            // check for collisions
            for (var i=activeBullets.length-1; i>=0; i--)
            {
                var colliders = activeBullets[i].getOverlappingObjects();
                for (var j=0; j<colliders.length; j++)
                {
                    if (colliders[j].isEnemy)
                    {
                        // create explosion
                        var position = colliders[j].getPosition();
                        wade.app.explosion(position);

                        // add points
                        score += 10;
                        scoreCounter.getSprite().setText(score);

                        // delete objects
                        wade.removeSceneObject(colliders[j]);
                        wade.removeSceneObject(activeBullets[i]);
                        wade.removeObjectFromArrayByIndex(i, activeBullets);
                        break;
                    }
                }
            }
        }, 'fire');

        wade.setMainLoopCallback(function()
        {
            var overlapping = ship.getOverlappingObjects();
            for (var i=0; i<overlapping.length; i++)
            {
                if (overlapping[i].isEnemy || overlapping[i].isEnemyBullet)
                {
                    wade.app.explosion(ship.getPosition());
                    wade.removeSceneObject(ship);
                    wade.setMainLoopCallback(null, 'fire');
                    wade.setMainLoopCallback(null, 'die');

                    // check high score
                    var shooterData = wade.retrieveLocalObject('shooterData');
                    var highScore = (shooterData && shooterData.highScore) || 0;
                    if (score > highScore)
                    {
                        shooterData = {highScore: score};
                        wade.storeLocalObject('shooterData', shooterData);
                    }

                    setTimeout(function()
                    {
                        wade.clearScene();
                        wade.app.init();
                        clearTimeout(nextEnemy);
                    }, 2000);
                }
            }
        }, 'die');

        // add a score counter
        score = 0;
        var scoreSprite = new TextSprite(score.toString(), '32px Verdana', '#f88', 'right');
        scoreCounter = new SceneObject(scoreSprite, 0, wade.getScreenWidth() / 2 - 10, -wade.getScreenHeight() / 2 + 30);
        wade.addSceneObject(scoreCounter);

        // spawn enemies
        enemyDelay = 2000;
        nextEnemy = setTimeout(wade.app.spawnEnemy, enemyDelay);
    };

    this.onMouseMove = function(eventData)
    {
        ship && ship.setPosition(eventData.screenPosition.x, eventData.screenPosition.y);
    };

    this.explosion = function(position)
    {
        var animation = new Animation('images/boom.png', 6, 4, 30);
        var explosionSprite = new Sprite();
        explosionSprite.setSize(100, 100);
        explosionSprite.addAnimation('boom', animation);
        var explosion = new SceneObject(explosionSprite, 0, position.x, position.y);
        wade.addSceneObject(explosion);
        explosion.playAnimation('boom');
        explosion.onAnimationEnd = function()
        {
            wade.removeSceneObject(this);
        };
    };

    this.spawnEnemy = function()
    {
        // create a sprite
        var sprite = new Sprite('images/enemy.png');

        // calculate start and end coordinates
        var startX = (Math.random() - 0.5) * wade.getScreenWidth();
        var endX = (Math.random() - 0.5) * wade.getScreenWidth();
        var startY = -wade.getScreenHeight() / 2 - sprite.getSize().y / 2;
        var endY = -startY;

        // add the object to the scene and make it move
        var enemy = new SceneObject(sprite, 0, startX, startY);
        wade.addSceneObject(enemy);
        enemy.moveTo(endX, endY, 200);
        enemy.isEnemy = true;

        // when the enemy is finished moving, delete it
        enemy.onMoveComplete = function()
        {
            wade.removeSceneObject(this);
        };

        // override step function
        enemy.originalStep = enemy.step;
        enemy.step = function()
        {
            this.originalStep();
            var enemyPosition = this.getPosition();
            var playerPosition = ship.getPosition();
            var angle = Math.atan2(playerPosition.y - enemyPosition.y, playerPosition.x - enemyPosition.x) - 3.14 / 2;
            this.setRotation(angle);
        };

        // enemy fire
        enemy.fire = function()
        {
            var enemySize = this.getSprite().getSize();
            var enemyPosition = this.getPosition();
            var playerPosition = ship.getPosition();

            // calculate direction
            var dx = playerPosition.x - enemyPosition.x;
            var dy = playerPosition.y - enemyPosition.y;
            var length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;

            // calculate initial and final position for the bullet
            var startX = enemyPosition.x + dx * enemySize.x / 2;
            var startY = enemyPosition.y + dy * enemySize.y / 2;
            var endX = startX + dx * 3000;
            var endY = startY + dy * 3000;

            // create bullet
            var sprite = new Sprite('images/enemyBullet.png');
            var bullet = new SceneObject(sprite, 0, startX, startY);
            bullet.isEnemyBullet = true;
            wade.addSceneObject(bullet);
            bullet.moveTo(endX, endY, 200);

            // delete bullet when it's finished moving
            bullet.onMoveComplete = function()
            {
                wade.removeSceneObject(this);
            };

            // schedule next bullet
            this.schedule(1000, 'fire');
        };
        enemy.schedule(500, 'fire');

        // spawn another enemy
        nextEnemy = setTimeout(wade.app.spawnEnemy, enemyDelay);
        enemyDelay = Math.max(enemyDelay - 30, 200);
    };
};
