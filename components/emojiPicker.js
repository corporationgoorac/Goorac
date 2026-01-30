class EmojiPicker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.skinTone = localStorage.getItem('goorac_skin_tone') || '';
        this.recentEmojis = JSON.parse(localStorage.getItem('goorac_recents')) || [];
        this.fullEmojiList = this.getComprehensiveEmojiData();
        this.activeCategory = 'recents';
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        this.loadCategory(this.recentEmojis.length > 0 ? 'recents' : 'smileys');
    }

    getComprehensiveEmojiData() {
        return [
            { id: 'smileys', name: 'Smileys & Emotion', icon: '😀', emojis: [
                {c:'😀', k:'smile happy'}, {c:'😃', k:'smile happy'}, {c:'😄', k:'smile happy'}, {c:'😁', k:'grin'}, 
                {c:'😆', k:'laugh'}, {c:'😅', k:'sweat smile'}, {c:'🤣', k:'rofl'}, {c:'😂', k:'joy'}, 
                {c:'🙂', k:'smile'}, {c:'🙃', k:'upside down'}, {c:'😉', k:'wink'}, {c:'😊', k:'blush'}, 
                {c:'😇', k:'halo'}, {c:'🥰', k:'love'}, {c:'😍', k:'heart eyes'}, {c:'🤩', k:'star eyes'}, 
                {c:'😘', k:'kiss'}, {c:'😗', k:'kiss'}, {c:'☺️', k:'smile'}, {c:'😚', k:'kiss'}, 
                {c:'😙', k:'kiss'}, {c:'😋', k:'yum'}, {c:'😛', k:'tongue'}, {c:'😜', k:'wink tongue'}, 
                {c:'🤪', k:'zany'}, {c:'😝', k:'squint tongue'}, {c:'🤑', k:'money'}, {c:'🤗', k:'hugs'}, 
                {c:'🤭', k:'hand mouth'}, {c:'🤫', k:'shh'}, {c:'🤔', k:'think'}, {c:'🤐', k:'zipper'}, 
                {c:'🤨', k:'eyebrow'}, {c:'😐', k:'neutral'}, {c:'😑', k:'expressionless'}, {c:'😶', k:'no mouth'}, 
                {c:'😏', k:'smirk'}, {c:'😒', k:'unamused'}, {c:'🙄', k:'roll eyes'}, {c:'😬', k:'grimace'}, 
                {c:'🤥', k:'lying'}, {c:'😌', k:'relieved'}, {c:'😔', k:'pensive'}, {c:'😪', k:'sleepy'}, 
                {c:'🤤', k:'drool'}, {c:'😴', k:'sleep'}, {c:'😷', k:'mask'}, {c:'🤒', k:'thermometer'}, 
                {c:'🤕', k:'bandage'}, {c:'🤢', k:'nauseated'}, {c:'🤮', k:'vomit'}, {c:'🤧', k:'sneeze'}, 
                {c:'🥵', k:'hot'}, {c:'🥶', k:'cold'}, {c:'🥴', k:'woozy'}, {c:'😵', k:'dizzy'}, 
                {c:'🤯', k:'explode'}, {c:'🤠', k:'cowboy'}, {c:'🥳', k:'party'}, {c:'😎', k:'cool'}, 
                {c:'🤓', k:'nerd'}, {c:'🧐', k:'monocle'}, {c:'😕', k:'confused'}, {c:'😟', k:'worried'}, 
                {c:'🙁', k:'frown'}, {c:'😮', k:'open mouth'}, {c:'😯', k:'hushed'}, {c:'😲', k:'astonished'}, 
                {c:'😳', k:'flushed'}, {c:'🥺', k:'pleading'}, {c:'😦', k:'frowning'}, {c:'😧', k:'anguished'}, 
                {c:'😨', k:'fearful'}, {c:'😰', k:'cold sweat'}, {c:'😥', k:'disappointed'}, {c:'😢', k:'cry'}, 
                {c:'😭', k:'sob'}, {c:'😱', k:'scream'}, {c:'😖', k:'confounded'}, {c:'😣', k:'persevering'}, 
                {c:'😞', k:'disappointed'}, {c:'😓', k:'sweat'}, {c:'😩', k:'weary'}, {c:'😫', k:'tired'}, 
                {c:'🥱', k:'yawn'}, {c:'😤', k:'triumph'}, {c:'😡', k:'pout'}, {c:'😠', k:'angry'}, 
                {c:'🤬', k:'cursing'}, {c:'😈', k:'devil'}, {c:'👿', k:'devil angry'}, {c:'💀', k:'skull'}, 
                {c:'☠️', k:'skull bones'}, {c:'💩', k:'poop'}, {c:'🤡', k:'clown'}, {c:'👹', k:'ogre'}, 
                {c:'👺', k:'goblin'}, {c:'👻', k:'ghost'}, {c:'👽', k:'alien'}, {c:'👾', k:'monster'}, 
                {c:'🤖', k:'robot'}, {c:'😺', k:'cat smile'}, {c:'😸', k:'cat grin'}, {c:'😹', k:'cat joy'}, 
                {c:'😻', k:'cat love'}, {c:'😼', k:'cat wry'}, {c:'😽', k:'cat kiss'}, {c:'🙀', k:'cat scream'}, 
                {c:'😿', k:'cat crying'}, {c:'😾', k:'cat pout'}
            ]},
            { id: 'people', name: 'People & Body', icon: '👋', emojis: [
                {c:'👋', k:'wave', s:1}, {c:'🤚', k:'back hand', s:1}, {c:'🖐️', k:'fingers splayed', s:1}, 
                {c:'✋', k:'hand', s:1}, {c:'🖖', k:'vulcan', s:1}, {c:'👌', k:'ok', s:1}, 
                {c:'🤌', k:'pinched fingers', s:1}, {c:'🤏', k:'pinching', s:1}, {c:'✌️', k:'victory', s:1}, 
                {c:'🤞', k:'crossed', s:1}, {c:'🤟', k:'love you', s:1}, {c:'🤘', k:'rock', s:1}, 
                {c:'🤙', k:'call me', s:1}, {c:'👈', k:'point left', s:1}, {c:'👉', k:'point right', s:1}, 
                {c:'👆', k:'point up', s:1}, {c:'🖕', k:'middle finger', s:1}, {c:'👇', k:'point down', s:1}, 
                {c:'☝️', k:'index up', s:1}, {c:'👍', k:'thumbs up', s:1}, {c:'👎', k:'thumbs down', s:1}, 
                {c:'✊', k:'fist', s:1}, {c:'👊', k:'punch', s:1}, {c:'🤛', k:'left fist', s:1}, 
                {c:'🤜', k:'right fist', s:1}, {c:'👏', k:'clap', s:1}, {c:'🙌', k:'hands up', s:1}, 
                {c:'👐', k:'open hands', s:1}, {c:'🤲', k:'palms up', s:1}, {c:'🤝', k:'handshake', s:1}, 
                {c:'🙏', k:'pray', s:1}, {c:'✍️', k:'write', s:1}, {c:'💅', k:'nail polish', s:1}, 
                {c:'🤳', k:'selfie', s:1}, {c:'💪', k:'muscle', s:1}, {c:'🦵', k:'leg', s:1}, 
                {c:'🦶', k:'foot', s:1}, {c:'👂', k:'ear', s:1}, {c:'🦻', k:'hearing aid', s:1}, 
                {c:'👃', k:'nose', s:1}, {c:'🧠', k:'brain'}, {c:'🦷', k:'tooth'}, {c:'🦴', k:'bone'}, 
                {c:'👀', k:'eyes'}, {c:'👁️', k:'eye'}, {c:'👅', k:'tongue'}, {c:'👄', k:'mouth'}, 
                {c:'👶', k:'baby', s:1}, {c:'🧒', k:'child', s:1}, {c:'👦', k:'boy', s:1}, 
                {c:'👧', k:'girl', s:1}, {c:'🧑', k:'person', s:1}, {c:'👱', k:'blond', s:1}, 
                {c:'👨', k:'man', s:1}, {c:'🧔', k:'beard', s:1}, {c:'👨‍🦰', k:'red hair', s:1}, 
                {c:'👨‍🦱', k:'curly hair', s:1}, {c:'👨‍🦳', k:'white hair', s:1}, {c:'👨‍🦲', k:'bald', s:1}, 
                {c:'👩', k:'woman', s:1}, {c:'👩‍🦰', k:'red hair', s:1}, {c:'👩‍🦱', k:'curly hair', s:1}, 
                {c:'👩‍🦳', k:'white hair', s:1}, {c:'👩‍🦲', k:'bald', s:1}, {c:'🧓', k:'older person', s:1}, 
                {c:'👴', k:'old man', s:1}, {c:'👵', k:'old woman', s:1}, {c:'🙍', k:'frowning person', s:1}, 
                {c:'🙎', k:'pouting person', s:1}, {c:'🙅', k:'no gesture', s:1}, {c:'🙆', k:'ok gesture', s:1}, 
                {c:'💁', k:'tipping hand', s:1}, {c:'🙋', k:'raising hand', s:1}, {c:'🙇', k:'bowing', s:1}, 
                {c:'🤦', k:'facepalm', s:1}, {c:'🤷', k:'shrug', s:1}, {c:'👨‍⚕️', k:'health worker', s:1}, 
                {c:'👨‍🎓', k:'student', s:1}, {c:'👨‍🏫', k:'teacher', s:1}, {c:'👨‍⚖️', k:'judge', s:1}, 
                {c:'👨‍🌾', k:'farmer', s:1}, {c:'👨‍🍳', k:'cook', s:1}, {c:'👨‍🔧', k:'mechanic', s:1}, 
                {c:'👨‍🏭', k:'factory worker', s:1}, {c:'👨‍💼', k:'office worker', s:1}, {c:'👨‍🔬', k:'scientist', s:1}, 
                {c:'👨‍💻', k:'technologist', s:1}, {c:'👨‍🎤', k:'singer', s:1}, {c:'👨‍🎨', k:'artist', s:1}, 
                {c:'👨‍✈️', k:'pilot', s:1}, {c:'👨‍🚀', k:'astronaut', s:1}, {c:'👨‍🚒', k:'firefighter', s:1}, 
                {c:'👮', k:'police', s:1}, {c:'🕵️', k:'detective', s:1}, {c:'💂', k:'guard', s:1}, 
                {c:'👷', k:'construction', s:1}, {c:'🤴', k:'prince', s:1}, {c:'👸', k:'princess', s:1}, 
                {c:'👳', k:'turban', s:1}, {c:'👲', k:'cap', s:1}, {c:'🧕', k:'headscarf', s:1}, 
                {c:'🤵', k:'tuxedo', s:1}, {c:'👰', k:'veil', s:1}, {c:'🤰', k:'pregnant', s:1}, 
                {c:'🤱', k:'breast feeding', s:1}, {c:'👼', k:'angel', s:1}, {c:'🎅', k:'santa', s:1}
            ]},
            { id: 'nature', name: 'Animals & Nature', icon: '🐶', emojis: [
                {c:'🐶', k:'dog face'}, {c:'🐱', k:'cat face'}, {c:'🐭', k:'mouse face'}, {c:'🐹', k:'hamster'}, 
                {c:'🐰', k:'rabbit'}, {c:'🦊', k:'fox'}, {c:'🐻', k:'bear'}, {c:'🐼', k:'panda'}, 
                {c:'🐨', k:'koala'}, {c:'🐯', k:'tiger'}, {c:'🦁', k:'lion'}, {c:'🐮', k:'cow'}, 
                {c:'🐷', k:'pig'}, {c:'🐽', k:'pig nose'}, {c:'🐸', k:'frog'}, {c:'🐵', k:'monkey'}, 
                {c:'🙈', k:'see no evil'}, {c:'🙉', k:'hear no evil'}, {c:'🙊', k:'speak no evil'}, {c:'🐒', k:'monkey'}, 
                {c:'🐔', k:'chicken'}, {c:'🐧', k:'penguin'}, {c:'🐦', k:'bird'}, {c:'🐤', k:'baby chick'}, 
                {c:'🐣', k:'hatching chick'}, {c:'🐥', k:'front chick'}, {c:'🦆', k:'duck'}, {c:'🦅', k:'eagle'}, 
                {c:'🦉', k:'owl'}, {c:'🦇', k:'bat'}, {c:'🐺', k:'wolf'}, {c:'🐗', k:'boar'}, 
                {c:'🐴', k:'horse'}, {c:'🦄', k:'unicorn'}, {c:'🐝', k:'bee'}, {c:'🐛', k:'bug'}, 
                {c:'🦋', k:'butterfly'}, {c:'🐌', k:'snail'}, {c:'🐚', k:'shell'}, {c:'🐞', k:'beetle'}, 
                {c:'🐜', k:'ant'}, {c:'🦗', k:'cricket'}, {c:'🕷️', k:'spider'}, {c:'🕸️', k:'web'}, 
                {c:'🦂', k:'scorpion'}, {c:'🦟', k:'mosquito'}, {c:'🦠', k:'microbe'}, {c:'🐢', k:'turtle'}, 
                {c:'🐍', k:'snake'}, {c:'🦎', k:'lizard'}, {c:'🦖', k:'t-rex'}, {c:'🦕', k:'sauropod'}, 
                {c:'🐙', k:'octopus'}, {c:'🦑', k:'squid'}, {c:'🦐', k:'shrimp'}, {c:'🦞', k:'lobster'}, 
                {c:'🦀', k:'crab'}, {c:'🐡', k:'blowfish'}, {c:'🐠', k:'tropical fish'}, {c:'🐟', k:'fish'}, 
                {c:'🐬', k:'dolphin'}, {c:'🐳', k:'whale'}, {c:'🐋', k:'spouting whale'}, {c:'🦈', k:'shark'}, 
                {c:'🐊', k:'crocodile'}, {c:'🐅', k:'tiger full'}, {c:'🐆', k:'leopard'}, {c:'🦓', k:'zebra'}, 
                {c:'🦍', k:'gorilla'}, {c:'🦧', k:'orangutan'}, {c:'🐘', k:'elephant'}, {c:'🦛', k:'hippo'}, 
                {c:'🦏', k:'rhino'}, {c:'🐪', k:'camel'}, {c:'🐫', k:'two-hump camel'}, {c:'🦒', k:'giraffe'}, 
                {c:'🦘', k:'kangaroo'}, {c:'🐃', k:'water buffalo'}, {c:'🐂', k:'ox'}, {c:'🐄', k:'bull'}, 
                {c:'🐎', k:'horse full'}, {c:'🐖', k:'pig full'}, {c:'🐏', k:'ram'}, {c:'🐑', k:'sheep'}, 
                {c:'🦙', k:'llama'}, {c:'🐐', k:'goat'}, {c:'🦌', k:'deer'}, {c:'🐕', k:'dog full'}, 
                {c:'🐩', k:'poodle'}, {c:'🦮', k:'guide dog'}, {c:'🐕‍🦺', k:'service dog'}, {c:'🐈', k:'cat full'}, 
                {c:'🐓', k:'rooster'}, {c:'🦃', k:'turkey'}, {c:'🦚', k:'peacock'}, {c:'🦜', k:'parrot'}, 
                {c:'🦢', k:'swan'}, {c:'🦩', k:'flamingo'}, {c:'🕊️', k:'dove'}, {c:'🐇', k:'rabbit full'}, 
                {c:'🦝', k:'raccoon'}, {c:'🦨', k:'skunk'}, {c:'🦡', k:'badger'}, {c:'🦦', k:'otter'}, 
                {c:'🦥', k:'sloth'}, {c:'🐁', k:'mouse full'}, {c:'🐀', k:'rat'}, {c:'🐿️', k:'chipmunk'}, 
                {c:'🦔', k:'hedgehog'}, {c:'🐾', k:'paw prints'}, {c:'🐉', k:'dragon'}, {c:'🐲', k:'dragon face'}, 
                {c:'🌵', k:'cactus'}, {c:'🎄', k:'christmas tree'}, {c:'🌲', k:'evergreen'}, {c:'🌳', k:'deciduous'}, 
                {c:'🌴', k:'palm'}, {c:'🌱', k:'seedling'}, {c:'🌿', k:'herb'}, {c:'☘️', k:'shamrock'}, 
                {c:'🍀', k:'four leaf'}, {c:'🎍', k:'bamboo'}, {c:'🎋', k:'tanabata'}, {c:'🍃', k:'wind'}, 
                {c:'🍂', k:'fallen leaf'}, {c:'🍁', k:'maple'}, {c:'🍄', k:'mushroom'}, {c:'🌾', k:'sheaf'}, 
                {c:'💐', k:'bouquet'}, {c:'🌷', k:'tulip'}, {c:'🌹', k:'rose'}, {c:'🥀', k:'wilted flower'}, 
                {c:'🌺', k:'hibiscus'}, {c:'🌸', k:'cherry blossom'}, {c:'🌼', k:'blossom'}, {c:'🌻', k:'sunflower'}, 
                {c:'🌞', k:'sun face'}, {c:'🌝', k:'full sun'}, {c:'🌛', k:'full moon face'}, {c:'🌜', k:'last quarter'}, 
                {c:'🌚', k:'new moon face'}, {c:'🌕', k:'full moon'}, {c:'🌖', k:'waning gibbous'}, {c:'🌗', k:'last quarter'}, 
                {c:'🌘', k:'waning crescent'}, {c:'🌑', k:'new moon'}, {c:'🌒', k:'waxing crescent'}, {c:'🌓', k:'first quarter'}, 
                {c:'🌔', k:'waxing gibbous'}, {c:'🌙', k:'crescent'}, {c:'🌎', k:'earth americas'}, {c:'🌍', k:'earth africa'}, 
                {c:'🌏', k:'earth asia'}, {c:'🪐', k:'ringed planet'}, {c:'💫', k:'dizzy'}, {c:'⭐', k:'star'}, 
                {c:'🌟', k:'glowing star'}, {c:'✨', k:'sparkles'}, {c:'⚡', k:'zap'}, {c:'☄️', k:'comet'}, 
                {c:'💥', k:'boom'}, {c:'🔥', k:'fire'}, {c:'🌪️', k:'tornado'}, {c:'🌈', k:'rainbow'}, 
                {c:'☀️', k:'sunny'}, {c:'🌤️', k:'small cloud'}, {c:'⛅', k:'sun behind cloud'}, {c:'🌥️', k:'cloud sun'}, 
                {c:'☁️', k:'cloud'}, {c:'🌦️', k:'sun rain'}, {c:'🌧️', k:'rain cloud'}, {c:'🌨️', k:'rain'}, 
                {c:'🌩️', k:'lightning'}, {c:'', k:'lightning rain'}, {c:'❄️', k:'snow'}, {c:'☃️', k:'snowman'}, 
                {c:'⛄', k:'snowman snow'}, {c:'🌬️', k:'wind face'}, {c:'💨', k:'dash'}, {c:'💧', k:'droplet'}, 
                {c:'💦', k:'sweat'}, {c:'☔', k:'umbrella'}, {c:'☂️', k:'umbrella open'}, {c:'🌊', k:'wave'}, 
                {c:'🌫️', k:'fog'}
            ]},
            { id: 'food', name: 'Food & Drink', icon: '🍔', emojis: [
                {c:'🍇', k:'grapes'}, {c:'🍈', k:'melon'}, {c:'🍉', k:'watermelon'}, {c:'🍊', k:'tangerine'}, 
                {c:'🍋', k:'lemon'}, {c:'🍌', k:'banana'}, {c:'🍍', k:'pineapple'}, {c:'🥭', k:'mango'}, 
                {c:'🍎', k:'apple red'}, {c:'🍏', k:'apple green'}, {c:'🍐', k:'pear'}, {c:'🍑', k:'peach'}, 
                {c:'🍒', k:'cherries'}, {c:'🍓', k:'strawberry'}, {c:'🥝', k:'kiwi'}, {c:'🍅', k:'tomato'}, 
                {c:'🥥', k:'coconut'}, {c:'🥑', k:'avocado'}, {c:'🍆', k:'eggplant'}, {c:'🥔', k:'potato'}, 
                {c:'🥕', k:'carrot'}, {c:'🌽', k:'corn'}, {c:'🌶️', k:'hot pepper'}, {c:'🥒', k:'cucumber'}, 
                {c:'🥬', k:'leafy green'}, {c:'🥦', k:'broccoli'}, {c:'🧄', k:'garlic'}, {c:'🧅', k:'onion'}, 
                {c:'🍄', k:'mushroom'}, {c:'🥜', k:'peanuts'}, {c:'🌰', k:'chestnut'}, {c:'🍞', k:'bread'}, 
                {c:'🥐', k:'croissant'}, {c:'🥖', k:'baguette'}, {c:'🥨', k:'pretzel'}, {c:'🥯', k:'bagel'}, 
                {c:'🥞', k:'pancakes'}, {c:'🧇', k:'waffle'}, {c:'🧀', k:'cheese'}, {c:'🍖', k:'meat'}, 
                {c:'🍗', k:'poultry'}, {c:'🥩', k:'steak'}, {c:'🥓', k:'bacon'}, {c:'🍔', k:'hamburger'}, 
                {c:'🍟', k:'fries'}, {c:'🍕', k:'pizza'}, {c:'🌭', k:'hot dog'}, {c:'🥪', k:'sandwich'}, 
                {c:'🌮', k:'taco'}, {c:'🌯', k:'burrito'}, {c:'🥙', k:'stuffed flatbread'}, {c:'🧆', k:'falafel'}, 
                {c:'🥚', k:'egg'}, {c:'🍳', k:'cooking'}, {c:'🥘', k:'shallow pan'}, {c:'🍲', k:'pot of food'}, 
                {c:'🥣', k:'bowl with spoon'}, {c:'🥗', k:'salad'}, {c:'🍿', k:'popcorn'}, {c:'🧈', k:'butter'}, 
                {c:'🧂', k:'salt'}, {c:'🥫', k:'canned food'}, {c:'🍱', k:'bento'}, {c:'🍘', k:'rice cracker'}, 
                {c:'🍙', k:'rice ball'}, {c:'🍚', k:'cooked rice'}, {c:'🍛', k:'curry rice'}, {c:'🍜', k:'ramen'}, 
                {c:'🍝', k:'spaghetti'}, {c:'🍠', k:'roasted potato'}, {c:'🍢', k:'oden'}, {c:'🍣', k:'sushi'}, 
                {c:'🍤', k:'fried shrimp'}, {c:'🍥', k:'fish cake'}, {c:'🥮', k:'moon cake'}, {c:'🍡', k:'dango'}, 
                {c:'🥟', k:'dumpling'}, {c:'🥠', k:'fortune cookie'}, {c:'🥡', k:'takeout box'}, {c:'🦪', k:'oyster'}, 
                {c:'🍦', k:'soft ice cream'}, {c:'🍧', k:'shaved ice'}, {c:'🍨', k:'ice cream'}, {c:'🍩', k:'doughnut'}, 
                {c:'🍪', k:'cookie'}, {c:'🎂', k:'birthday cake'}, {c:'🍰', k:'shortcake'}, {c:'🧁', k:'cupcake'}, 
                {c:'🥧', k:'pie'}, {c:'🍫', k:'chocolate bar'}, {c:'🍬', k:'candy'}, {c:'🍭', k:'lollipop'}, 
                {c:'🍮', k:'custard'}, {c:'🍯', k:'honey pot'}, {c:'🍼', k:'baby bottle'}, {c:'🥛', k:'milk'}, 
                {c:'☕', k:'coffee'}, {c:'🍵', k:'tea'}, {c:'🍶', k:'sake'}, {c:'🍾', k:'champagne'}, 
                {c:'🍷', k:'wine'}, {c:'🍸', k:'cocktail'}, {c:'🍹', k:'tropical drink'}, {c:'🍺', k:'beer'}, 
                {c:'🍻', k:'beers'}, {c:'🥂', k:'clinking glasses'}, {c:'🥃', k:'tumbler glass'}, {c:'🥤', k:'cup with straw'}, 
                {c:'🧃', k:'beverage box'}, {c:'🧉', k:'mate'}, {c:'🧊', k:'ice'}, {c:'🥢', k:'chopsticks'}, 
                {c:'🍽️', k:'fork knife'}, {c:'🍴', k:'fork and knife'}, {c:'🥄', k:'spoon'}
            ]},
            { id: 'activity', name: 'Activity & Sports', icon: '⚽', emojis: [
                {c:'⚽', k:'soccer'}, {c:'🏀', k:'basketball'}, {c:'🏈', k:'football'}, {c:'⚾', k:'baseball'}, 
                {c:'🥎', k:'softball'}, {c:'🎾', k:'tennis'}, {c:'🏐', k:'volleyball'}, {c:'🏉', k:'rugby'}, 
                {c:'🥏', k:'frisbee'}, {c:'🎱', k:'8 ball'}, {c:'🪀', k:'yo-yo'}, {c:'🏓', k:'ping pong'}, 
                {c:'🏸', k:'badminton'}, {c:'🏒', k:'hockey'}, {c:'🏑', k:'field hockey'}, {c:'🥍', k:'lacrosse'}, 
                {c:'🏏', k:'cricket'}, {c:'🥅', k:'goal net'}, {c:'⛳', k:'golf'}, {c:'🪁', k:'kite'}, 
                {c:'🏹', k:'archery'}, {c:'🎣', k:'fishing'}, {c:'🤿', k:'diving mask'}, {c:'🥊', k:'boxing'}, 
                {c:'🥋', k:'martial arts'}, {c:'🎽', k:'running shirt'}, {c:'🛹', k:'skateboard'}, {c:'🛼', k:'roller skate'}, 
                {c:'🛷', k:'sled'}, {c:'⛸️', k:'ice skate'}, {c:'🥌', k:'curling'}, {c:'🎿', k:'skis'}, 
                {c:'⛷️', k:'skier'}, {c:'🏂', k:'snowboarder'}, {c:'🪂', k:'parachute'}, {c:'🏋️', k:'weight lifting'}, 
                {c:'🤼', k:'wrestling'}, {c:'🤸', k:'cartwheel'}, {c:'⛹️', k:'bouncing ball'}, {c:'🤺', k:'fencing'}, 
                {c:'🤾', k:'handball'}, {c:'🏌️', k:'golfing'}, {c:'🏇', k:'horse racing'}, {c:'🧘', k:'yoga'}, 
                {c:'🏄', k:'surfing'}, {c:'🏊', k:'swimming'}, {c:'🤽', k:'water polo'}, {c:'🚣', k:'rowing'}, 
                {c:'🧗', k:'climbing'}, {c:'🚵', k:'mountain biking'}, {c:'🚴', k:'biking'}, {c:'🏆', k:'trophy'}, 
                {c:'🥇', k:'1st place'}, {c:'🥈', k:'2nd place'}, {c:'🥉', k:'3rd place'}, {c:'🏅', k:'medal'}, 
                {c:'🎖️', k:'military medal'}, {c:'🏵️', k:'rosette'}, {c:'🎗️', k:'reminder ribbon'}, {c:'🎫', k:'ticket'}, 
                {c:'🎟️', k:'admission ticket'}, {c:'🎪', k:'circus'}, {c:'🤹', k:'juggling'}, {c:'🎭', k:'performing arts'}, 
                {c:'🎨', k:'art'}, {c:'🎬', k:'clapper board'}, {c:'🎤', k:'microphone'}, {c:'🎧', k:'headphone'}, 
                {c:'🎼', k:'musical score'}, {c:'🎹', k:'musical keyboard'}, {c:'🥁', k:'drum'}, {c:'🎷', k:'saxophone'}, 
                {c:'🎺', k:'trumpet'}, {c:'🎸', k:'guitar'}, {c:'🪕', k:'banjo'}, {c:'🎻', k:'violin'}, 
                {c:'🎲', k:'game die'}, {c:'♟️', k:'chess pawn'}, {c:'🎯', k:'bullseye'}, {c:'🎳', k:'bowling'}, 
                {c:'🎮', k:'video game'}, {c:'🎰', k:'slot machine'}, {c:'🧩', k:'puzzle'}
            ]},
            { id: 'places', name: 'Travel & Places', icon: '✈️', emojis: [
                {c:'🚗', k:'car'}, {c:'🚕', k:'taxi'}, {c:'🚙', k:'suv'}, {c:'🚌', k:'bus'}, 
                {c:'🚎', k:'trolleybus'}, {c:'🏎️', k:'racing car'}, {c:'🚓', k:'police car'}, {c:'🚑', k:'ambulance'}, 
                {c:'🚒', k:'fire engine'}, {c:'🚐', k:'minibus'}, {c:'🚚', k:'truck'}, {c:'🚛', k:'lorry'}, 
                {c:'🚜', k:'tractor'}, {c:'🏍️', k:'motorcycle'}, {c:'🛵', k:'scooter'}, {c:'🦽', k:'manual wheelchair'}, 
                {c:'🦼', k:'motorized wheelchair'}, {c:'🛺', k:'auto rickshaw'}, {c:'🚲', k:'bicycle'}, {c:'🛴', k:'kick scooter'}, 
                {c:'🛹', k:'skateboard'}, {c:'🚏', k:'bus stop'}, {c:'🛣️', k:'motorway'}, {c:'🛤️', k:'railway track'}, 
                {c:'🛢️', k:'oil drum'}, {c:'⛽', k:'fuel pump'}, {c:'🚨', k:'police light'}, {c:'🚥', k:'traffic light'}, 
                {c:'🚦', k:'vertical traffic light'}, {c:'🛑', k:'stop sign'}, {c:'🚧', k:'construction'}, {c:'⚓', k:'anchor'}, 
                {c:'⛵', k:'sailboat'}, {c:'🛶', k:'canoe'}, {c:'speedboat', k:'speedboat'}, {c:'🛳️', k:'passenger ship'}, 
                {c:'⛴️', k:'ferry'}, {c:'🛥️', k:'motor boat'}, {c:'🚢', k:'ship'}, {c:'✈️', k:'airplane'}, 
                {c:'🛩️', k:'small airplane'}, {c:'🛫', k:'departure'}, {c:'🛬', k:'arrival'}, {c:'🪂', k:'parachute'}, 
                {c:'💺', k:'seat'}, {c:'🚁', k:'helicopter'}, {c:'🚟', k:'suspension railway'}, {c:'🚠', k:'mountain cableway'}, 
                {c:'🚡', k:'aerial tramway'}, {c:'🛰️', k:'satellite'}, {c:'🚀', k:'rocket'}, {c:'🛸', k:'flying saucer'}, 
                {c:'🛎️', k:'bellhop bell'}, {c:'🧳', k:'luggage'}, {c:'⌛', k:'hourglass'}, {c:'⏳', k:'hourglass flowing'}, 
                {c:'⌚', k:'watch'}, {c:'⏰', k:'alarm clock'}, {c:'⏱️', k:'stopwatch'}, {c:'⏲️', k:'timer clock'}, 
                {c:'🕰️', k:'mantelpiece clock'}, {c:'🕛', k:'twelve'}, {c:'🕧', k:'twelve thirty'}, {c:'🕐', k:'one'}, 
                {c:'🕜', k:'one thirty'}, {c:'🕑', k:'two'}, {c:'🕝', k:'two thirty'}, {c:'🕒', k:'three'}, 
                {c:'🕞', k:'three thirty'}, {c:'🕓', k:'four'}, {c:'🕟', k:'four thirty'}, {c:'🕔', k:'five'}, 
                {c:'🕠', k:'five thirty'}, {c:'🕕', k:'six'}, {c:'🕡', k:'six thirty'}, {c:'🕖', k:'seven'}, 
                {c:'🕢', k:'seven thirty'}, {c:'🕗', k:'eight'}, {c:'🕣', k:'eight thirty'}, {c:'🕘', k:'nine'}, 
                {c:'🕤', k:'nine thirty'}, {c:'🕙', k:'ten'}, {c:'🕥', k:'ten thirty'}, {c:'🕚', k:'eleven'}, 
                {c:'🕦', k:'eleven thirty'}, {c:'🌑', k:'new moon'}, {c:'🌒', k:'waxing crescent'}, {c:'🌓', k:'first quarter'}, 
                {c:'🌔', k:'waxing gibbous'}, {c:'🌕', k:'full moon'}, {c:'🌖', k:'waning gibbous'}, {c:'🌗', k:'last quarter'}, 
                {c:'🌘', k:'waning crescent'}, {c:'🌙', k:'crescent moon'}, {c:'🌚', k:'new moon face'}, {c:'🌛', k:'first quarter face'}, 
                {c:'🌜', k:'last quarter face'}, {c:'🌡️', k:'thermometer'}, {c:'☀️', k:'sun'}, {c:'🌝', k:'full moon face'}, 
                {c:'🌞', k:'sun face'}, {c:'⭐', k:'star'}, {c:'🌟', k:'glowing star'}, {c:'🌠', k:'shooting star'}, 
                {c:'☁️', k:'cloud'}, {c:'⛅', k:'partly sunny'}, {c:'⛈️', k:'thunderstorm'}, {c:'🌤️', k:'small cloud'}, 
                {c:'🌥️', k:'sun behind large cloud'}, {c:'🌦️', k:'sun behind rain cloud'}, {c:'🌧️', k:'cloud with rain'}, {c:'🌨️', k:'cloud with snow'}, 
                {c:'🌩️', k:'cloud with lightning'}, {c:'🌪️', k:'tornado'}, {c:'🌫️', k:'fog'}, {c:'🌬️', k:'wind face'}, 
                {c:'🌀', k:'cyclone'}, {c:'🌈', k:'rainbow'}, {c:'🌂', k:'closed umbrella'}, {c:'☔', k:'umbrella with rain'}, 
                {c:'☂️', k:'umbrella'}, {c:'⚡', k:'high voltage'}, {c:'❄️', k:'snowflake'}, {c:'☃️', k:'snowman'}, 
                {c:'⛄', k:'snowman without snow'}, {c:'☄️', k:'comet'}, {c:'🔥', k:'fire'}, {c:'💧', k:'droplet'}, 
                {c:'🌊', k:'water wave'}
            ]},
            { id: 'objects', name: 'Objects', icon: '💡', emojis: [
                {c:'👓', k:'glasses'}, {c:'🕶️', k:'sunglasses'}, {c:'🥽', k:'goggles'}, {c:'🥼', k:'lab coat'}, 
                {c:'🦺', k:'safety vest'}, {c:'👔', k:'necktie'}, {c:'👕', k:'t-shirt'}, {c:'👖', k:'jeans'}, 
                {c:'🧣', k:'scarf'}, {c:'🧤', k:'gloves'}, {c:'🧥', k:'coat'}, {c:'🧦', k:'socks'}, 
                {c:'👗', k:'dress'}, {c:'👘', k:'kimono'}, {c:'🥻', k:'sari'}, {c:'🩱', k:'swimsuit'}, 
                {c:'🩲', k:'briefs'}, {c:'🩳', k:'shorts'}, {c:'👙', k:'bikini'}, {c:'👚', k:'clothes'}, 
                {c:'👛', k:'purse'}, {c:'👜', k:'handbag'}, {c:'👝', k:'pouch'}, {c:'🛍️', k:'shopping bags'}, 
                {c:'🎒', k:'backpack'}, {c:'👞', k:'shoe'}, {c:'👟', k:'running shoe'}, {c:'🥾', k:'hiking boot'}, 
                {c:'🥿', k:'flat shoe'}, {c:'👠', k:'high heel'}, {c:'👡', k:'sandal'}, {c:'🩰', k:'ballet shoes'}, 
                {c:'👢', k:'boot'}, {c:'👑', k:'crown'}, {c:'👒', k:'woman hat'}, {c:'🎩', k:'top hat'}, 
                {c:'🎓', k:'graduation cap'}, {c:'🧢', k:'billed cap'}, {c:'⛑️', k:'helmet'}, {c:'📿', k:'prayer beads'}, 
                {c:'💄', k:'lipstick'}, {c:'💍', k:'ring'}, {c:'💎', k:'gem'}, {c:'🔇', k:'mute'}, 
                {c:'🔈', k:'speaker low'}, {c:'🔉', k:'speaker mid'}, {c:'🔊', k:'speaker high'}, {c:'📢', k:'loudspeaker'}, 
                {c:'📣', k:'megaphone'}, {c:'📯', k:'postal horn'}, {c:'🔔', k:'bell'}, {c:'🔕', k:'no bell'}, 
                {c:'🎼', k:'musical score'}, {c:'🎵', k:'musical note'}, {c:'🎶', k:'musical notes'}, {c:'🎙️', k:'studio microphone'}, 
                {c:'🎚️', k:'level slider'}, {c:'🎛️', k:'control knobs'}, {c:'🎤', k:'microphone'}, {c:'🎧', k:'headphone'}, 
                {c:'📻', k:'radio'}, {c:'🎷', k:'saxophone'}, {c:'🎸', k:'guitar'}, {c:'🎹', k:'musical keyboard'}, 
                {c:'🎺', k:'trumpet'}, {c:'🎻', k:'violin'}, {c:'🪕', k:'banjo'}, {c:'🥁', k:'drum'}, 
                {c:'📱', k:'mobile phone'}, {c:'📲', k:'calling'}, {c:'☎️', k:'telephone'}, {c:'📞', k:'telephone receiver'}, 
                {c:'📟', k:'pager'}, {c:'📠', k:'fax'}, {c:'🔋', k:'battery'}, {c:'🔌', k:'electric plug'}, 
                {c:'💻', k:'laptop'}, {c:'🖥️', k:'desktop'}, {c:'🖨️', k:'printer'}, {c:'⌨️', k:'keyboard'}, 
                {c:'🖱️', k:'mouse'}, {c:'🖲️', k:'trackball'}, {c:'💽', k:'computer disk'}, {c:'💾', k:'floppy disk'}, 
                {c:'💿', k:'optical disk'}, {c:'📀', k:'dvd'}, {c:'🧮', k:'abacus'}, {c:'🎥', k:'movie camera'}, 
                {c:'🎞️', k:'film frames'}, {c:'📽️', k:'film projector'}, {c:'🎬', k:'clapper board'}, {c:'📺', k:'television'}, 
                {c:'📷', k:'camera'}, {c:'📸', k:'camera flash'}, {c:'📹', k:'video camera'}, {c:'📼', k:'videocassette'}, 
                {c:'🔍', k:'magnifying glass left'}, {c:'🔎', k:'magnifying glass right'}, {c:'🕯️', k:'candle'}, {c:'💡', k:'light bulb'}, 
                {c:'🔦', k:'flashlight'}, {c:'🏮', k:'red paper lantern'}, {c:'🪔', k:'diya lamp'}, {c:'📔', k:'notebook'}, 
                {c:'📕', k:'closed book'}, {c:'📖', k:'open book'}, {c:'📗', k:'green book'}, {c:'📘', k:'blue book'}, 
                {c:'📙', k:'orange book'}, {c:'📚', k:'books'}, {c:'📓', k:'notebook'}, {c:'📒', k:'ledger'}, 
                {c:'📃', k:'page with curl'}, {c:'📜', k:'scroll'}, {c:'📄', k:'page facing up'}, {c:'📰', k:'newspaper'}, 
                {c:'🗞️', k:'rolled newspaper'}, {c:'📑', k:'bookmark tabs'}, {c:'🔖', k:'bookmark'}, {c:'🏷️', k:'label'}, 
                {c:'💰', k:'money bag'}, {c:'coin', k:'coin'}, {c:'💴', k:'yen banknote'}, {c:'💵', k:'dollar banknote'}, 
                {c:'💶', k:'euro banknote'}, {c:'💷', k:'pound banknote'}, {c:'💸', k:'money with wings'}, {c:'💳', k:'credit card'}, 
                {c:'🧾', k:'receipt'}, {c:'💹', k:'chart increasing with yen'}, {c:'✉️', k:'envelope'}, {c:'📧', k:'e-mail'}, 
                {c:'📨', k:'incoming envelope'}, {c:'📩', k:'envelope with arrow'}, {c:'📤', k:'outbox tray'}, {c:'📥', k:'inbox tray'}, 
                {c:'📦', k:'package'}, {c:'📫', k:'closed mailbox with raised flag'}, {c:'📪', k:'closed mailbox with lowered flag'}, {c:'📬', k:'open mailbox with raised flag'}, 
                {c:'📭', k:'open mailbox with lowered flag'}, {c:'📮', k:'postbox'}, {c:'🗳️', k:'ballot box with ballot'}, {c:'✏️', k:'pencil'}, 
                {c:'✒️', k:'black nib'}, {c:'🖋️', k:'fountain pen'}, {c:'🖊️', k:'pen'}, {c:'🖌️', k:'paintbrush'}, 
                {c:'🖍️', k:'crayon'}, {c:'📝', k:'memo'}, {c:'💼', k:'briefcase'}, {c:'📁', k:'file folder'}, 
                {c:'📂', k:'open file folder'}, {c:'🗂️', k:'card index dividers'}, {c:'📅', k:'calendar'}, {c:'📆', k:'tear-off calendar'}, 
                {c:'🗒️', k:'spiral notepad'}, {c:'🗓️', k:'spiral calendar'}, {c:'📇', k:'card index'}, {c:'📈', k:'chart increasing'}, 
                {c:'📉', k:'chart decreasing'}, {c:'📊', k:'bar chart'}, {c:'📋', k:'clipboard'}, {c:'📌', k:'pushpin'}, 
                {c:'📍', k:'round pushpin'}, {c:'📎', k:'paperclip'}, {c:'🖇️', k:'linked paperclips'}, {c:'📏', k:'straight ruler'}, 
                {c:'📐', k:'triangular ruler'}, {c:'✂️', k:'scissors'}, {c:'🗃️', k:'card file box'}, {c:'🗄️', k:'file cabinet'}, 
                {c:'🗑️', k:'wastebasket'}, {c:'🔒', k:'locked'}, {c:'🔓', k:'unlocked'}, {c:'🔏', k:'locked with pen'}, 
                {c:'🔐', k:'locked with key'}, {c:'🔑', k:'key'}, {c:'🗝️', k:'old key'}, {c:'🔨', k:'hammer'}, 
                {c:'🪓', k:'axe'}, {c:'⛏️', k:'pick'}, {c:'⚒️', k:'hammer and pick'}, {c:'🛠️', k:'hammer and wrench'}, 
                {c:'🗡️', k:'dagger'}, {c:'⚔️', k:'crossed swords'}, {c:'🔫', k:'pistol'}, {c:'🪃', k:'boomerang'}, 
                {c:'🏹', k:'bow and arrow'}, {c:'🛡️', k:'shield'}, {c:'🔧', k:'wrench'}, {c:'nut', k:'nut and bolt'}, 
                {c:'⚙️', k:'gear'}, {c:'🗜️', k:'clamp'}, {c:'⚖️', k:'balance scale'}, {c:'🦯', k:'white cane'}, 
                {c:'🔗', k:'link'}, {c:'⛓️', k:'chains'}, {c:'🧰', k:'toolbox'}, {c:'🧲', k:'magnet'}, 
                {c:'⚗️', k:'alembic'}, {c:'🧪', k:'test tube'}, {c:'🧫', k:'petri dish'}, {c:'🧬', k:'dna'}, 
                {c:'🔬', k:'microscope'}, {c:'🔭', k:'telescope'}, {c:'📡', k:'satellite antenna'}, {c:'💉', k:'syringe'}, 
                {c:'🩸', k:'drop of blood'}, {c:'💊', k:'pill'}, {c:'🩹', k:'adhesive bandage'}, {c:'🩺', k:'stethoscope'}, 
                {c:'🚪', k:'door'}, {c:'🛏️', k:'bed'}, {c:'🛋️', k:'couch and lamp'}, {c:'🪑', k:'chair'}, 
                {c:'🚽', k:'toilet'}, {c:'🚿', k:'shower'}, {c:'🛁', k:'bathtub'}, {c:'🪒', k:'razor'}, 
                {c:'🧴', k:'lotion bottle'}, {c:'🧷', k:'safety pin'}, {c:'🧹', k:'broom'}, {c:'🧺', k:'basket'}, 
                {c:'🧻', k:'roll of paper'}, {c:'🧼', k:'soap'}, {c:'🧽', k:'sponge'}, {c:'🧯', k:'fire extinguisher'}, 
                {c:'🛒', k:'shopping cart'}, {c:'🚬', k:'cigarette'}, {c:'⚰️', k:'coffin'}, {c:'⚱️', k:'funeral urn'}, 
                {c:'🗿', k:'moai'}
            ]},
            { id: 'symbols', name: 'Symbols', icon: '❤️', emojis: [
                {c:'💘', k:'heart with arrow'}, {c:'💝', k:'heart with ribbon'}, {c:'💖', k:'sparkling heart'}, {c:'💗', k:'growing heart'}, 
                {c:'💓', k:'beating heart'}, {c:'💞', k:'revolving hearts'}, {c:'💕', k:'two hearts'}, {c:'💟', k:'heart decoration'}, 
                {c:'❣️', k:'heart exclamation'}, {c:'💔', k:'broken heart'}, {c:'❤️', k:'red heart'}, {c:'🧡', k:'orange heart'}, 
                {c:'💛', k:'yellow heart'}, {c:'💚', k:'green heart'}, {c:'💙', k:'blue heart'}, {c:'💜', k:'purple heart'}, 
                {c:'🤎', k:'brown heart'}, {c:'🖤', k:'black heart'}, {c:'🤍', k:'white heart'}, {c:'💯', k:'hundred points'}, 
                {c:'💢', k:'anger symbol'}, {c:'💬', k:'speech balloon'}, {c:'👁️‍🗨️', k:'eye in speech bubble'}, {c:'🗨️', k:'left speech bubble'}, 
                {c:'🗯️', k:'right anger bubble'}, {c:'💭', k:'thought balloon'}, {c:'💤', k:'zzz'}, {c:'💮', k:'white flower'}, 
                {c:'♨️', k:'hot springs'}, {c:'💈', k:'barber pole'}, {c:'🛑', k:'stop sign'}, {c:'🕛', k:'twelve oclock'}, 
                {c:'🕧', k:'twelve thirty'}, {c:'🕐', k:'one oclock'}, {c:'🕜', k:'one thirty'}, {c:'🕑', k:'two oclock'}, 
                {c:'🕝', k:'two thirty'}, {c:'🕒', k:'three oclock'}, {c:'🕞', k:'three thirty'}, {c:'🕓', k:'four oclock'}, 
                {c:'🕟', k:'four thirty'}, {c:'🕔', k:'five oclock'}, {c:'🕠', k:'five thirty'}, {c:'🕕', k:'six oclock'}, 
                {c:'🕡', k:'six thirty'}, {c:'🕖', k:'seven oclock'}, {c:'🕢', k:'seven thirty'}, {c:'🕗', k:'eight oclock'}, 
                {c:'🕣', k:'eight thirty'}, {c:'🕘', k:'nine oclock'}, {c:'🕤', k:'nine thirty'}, {c:'🕙', k:'ten oclock'}, 
                {c:'🕥', k:'ten thirty'}, {c:'🕚', k:'eleven oclock'}, {c:'🕦', k:'eleven thirty'}, {c:'🌀', k:'cyclone'}, 
                {c:'♠️', k:'spade suit'}, {c:'♥️', k:'heart suit'}, {c:'♦️', k:'diamond suit'}, {c:'♣️', k:'club suit'}, 
                {c:'🃏', k:'joker'}, {c:'🀄', k:'mahjong red dragon'}, {c:'🎴', k:'flower playing cards'}, {c:'🔇', k:'muted speaker'}, 
                {c:'🔈', k:'speaker low volume'}, {c:'🔉', k:'speaker medium volume'}, {c:'🔊', k:'speaker high volume'}, {c:'📢', k:'loudspeaker'}, 
                {c:'📣', k:'megaphone'}, {c:'📯', k:'postal horn'}, {c:'🔔', k:'bell'}, {c:'🔕', k:'bell with slash'}, 
                {c:'🎵', k:'musical note'}, {c:'🎶', k:'musical notes'}, {c:'🏧', k:'atm sign'}, {c:'🚮', k:'litter in bin sign'}, 
                {c:'🚰', k:'potable water'}, {c:'♿', k:'wheelchair symbol'}, {c:'🚹', k:'mens room'}, {c:'🚺', k:'womens room'}, 
                {c:'🚻', k:'restroom'}, {c:'🚼', k:'baby symbol'}, {c:'🚾', k:'water closet'}, {c:'🛂', k:'passport control'}, 
                {c:'🛃', k:'customs'}, {c:'🛄', k:'baggage claim'}, {c:'🛅', k:'left luggage'}, {c:'⚠️', k:'warning'}, 
                {c:'🚸', k:'children crossing'}, {c:'⛔', k:'no entry'}, {c:'🚫', k:'prohibited'}, {c:'🚳', k:'no bicycles'}, 
                {c:'🚭', k:'no smoking'}, {c:'🚯', k:'no littering'}, {c:'🚱', k:'non-potable water'}, {c:'🚷', k:'no pedestrians'}, 
                {c:'📵', k:'no mobile phones'}, {c:'🔞', k:'no one under eighteen'}, {c:'☢️', k:'radioactive'}, {c:'☣️', k:'biohazard'}, 
                {c:'⬆️', k:'up arrow'}, {c:'↗️', k:'up-right arrow'}, {c:'➡️', k:'right arrow'}, {c:'↘️', k:'down-right arrow'}, 
                {c:'⬇️', k:'down arrow'}, {c:'↙️', k:'down-left arrow'}, {c:'⬅️', k:'left arrow'}, {c:'↖️', k:'up-left arrow'}, 
                {c:'↕️', k:'up-down arrow'}, {c:'↔️', k:'left-right arrow'}, {c:'↩️', k:'right arrow curving left'}, {c:'↪️', k:'left arrow curving right'}, 
                {c:'⤴️', k:'right arrow curving up'}, {c:'⤵️', k:'right arrow curving down'}, {c:'🔃', k:'clockwise vertical arrows'}, {c:'🔄', k:'counterclockwise arrows button'}, 
                {c:'🔙', k:'back arrow'}, {c:'🔚', k:'end arrow'}, {c:'🔛', k:'on! arrow'}, {c:'🔜', k:'soon arrow'}, 
                {c:'🔝', k:'top arrow'}, {c:'🛐', k:'place of worship'}, {c:'⚛️', k:'atom symbol'}, {c:'🕉️', k:'om'}, 
                {c:'✡️', k:'star of david'}, {c:'☸️', k:'wheel of dharma'}, {c:'☯️', k:'yin yang'}, {c:'✝️', k:'latin cross'}, 
                {c:'☦️', k:'orthodox cross'}, {c:'☪️', k:'star and crescent'}, {c:'☮️', k:'peace symbol'}, {c:'🕎', k:'menorah'}, 
                {c:'🔯', k:'dotted six-pointed star'}, {c:'♈', k:'aries'}, {c:'♉', k:'taurus'}, {c:'♊', k:'gemini'}, 
                {c:'♋', k:'cancer'}, {c:'♌', k:'leo'}, {c:'♍', k:'virgo'}, {c:'♎', k:'libra'}, 
                {c:'♏', k:'scorpio'}, {c:'♐', k:'sagittarius'}, {c:'♑', k:'capricorn'}, {c:'♒', k:'aquarius'}, 
                {c:'♓', k:'pisces'}, {c:'⛎', k:'ophiuchus'}, {c:'🔀', k:'shuffle tracks button'}, {c:'🔁', k:'repeat button'}, 
                {c:'🔂', k:'repeat single button'}, {c:'▶️', k:'play button'}, {c:'⏩', k:'fast-forward button'}, {c:'⏭️', k:'next track button'}, 
                {c:'⏯️', k:'play or pause button'}, {c:'◀️', k:'reverse button'}, {c:'⏪', k:'fast reverse button'}, {c:'⏮️', k:'last track button'}, 
                {c:'🔼', k:'up button'}, {c:'⏫', k:'fast up button'}, {c:'🔽', k:'down button'}, {c:'⏬', k:'fast down button'}, 
                {c:'⏸️', k:'pause button'}, {c:'⏹️', k:'stop button'}, {c:'⏺️', k:'record button'}, {c:'⏏️', k:'eject button'}, 
                {c:'🎦', k:'cinema'}, {c:'🔅', k:'dim button'}, {c:'🔆', k:'bright button'}, {c:'📶', k:'antenna bars'}, 
                {c:'📳', k:'vibration mode'}, {c:'📴', k:'mobile phone off'}, {c:'♀️', k:'female sign'}, {c:'♂️', k:'male sign'}, 
                {c:'⚧️', k:'transgender symbol'}, {c:'✖️', k:'multiply'}, {c:'➕', k:'plus'}, {c:'➖', k:'minus'}, 
                {c:'➗', k:'divide'}, {c:'♾️', k:'infinity'}, {c:'‼️', k:'double exclamation mark'}, {c:'⁉️', k:'exclamation question mark'}, 
                {c:'❓', k:'red question mark'}, {c:'❔', k:'white question mark'}, {c:'❕', k:'white exclamation mark'}, {c:'❗', k:'red exclamation mark'}, 
                {c:'〰️', k:'wavy dash'}, {c:'💱', k:'currency exchange'}, {c:'💲', k:'heavy dollar sign'}, {c:'⚕️', k:'medical symbol'}, 
                {c:'♻️', k:'recycling symbol'}, {c:'⚜️', k:'fleur-de-lis'}, {c:'🔱', k:'trident emblem'}, {c:'📛', k:'name badge'}, 
                {c:'🔰', k:'japanese symbol for beginner'}, {c:'⭕', k:'hollow red circle'}, {c:'✅', k:'check mark button'}, {c:'☑️', k:'check box with check'}, 
                {c:'✔️', k:'check mark'}, {c:'❌', k:'cross mark'}, {c:'❎', k:'cross mark button'}, {c:'➰', k:'curly loop'}, 
                {c:'➿', k:'double curly loop'}, {c:'〽️', k:'part alternation mark'}, {c:'✳️', k:'eight-spoked asterisk'}, {c:'✴️', k:'eight-pointed star'}, 
                {c:'❇️', k:'sparkle'}, {c:'©️', k:'copyright'}, {c:'®️', k:'registered'}, {c:'™️', k:'trade mark'}, 
                {c:'🔠', k:'input latin uppercase'}, {c:'🔡', k:'input latin lowercase'}, {c:'🔢', k:'input numbers'}, {c:'🔣', k:'input symbols'}, 
                {c:'🔤', k:'input latin letters'}, {c:'🅰️', k:'a button (blood type)'}, {c:'🆎', k:'ab button (blood type)'}, {c:'🅱️', k:'b button (blood type)'}, 
                {c:'🆑', k:'cl button'}, {c:'🆒', k:'cool button'}, {c:'🆓', k:'free button'}, {c:'ℹ️', k:'information'}, 
                {c:'🆔', k:'id button'}, {c:'Ⓜ️', k:'circled m'}, {c:'🆕', k:'new button'}, {c:'🆖', k:'ng button'}, 
                {c:'🅾️', k:'o button (blood type)'}, {c:'🆗', k:'ok button'}, {c:'🅿️', k:'p button'}, {c:'🆘', k:'sos button'}, 
                {c:'🆙', k:'up! button'}, {c:'🆚', k:'vs button'}, {c:'🈁', k:'japanese here button'}, {c:'🈂️', k:'japanese service charge button'}, 
                {c:'🈷️', k:'japanese monthly amount button'}, {c:'🈶', k:'japanese not free of charge button'}, {c:'🈯', k:'japanese reserved button'}, {c:'🉐', k:'japanese bargain button'}, 
                {c:'🈹', k:'japanese discount button'}, {c:'🈚', k:'japanese free of charge button'}, {c:'🈲', k:'japanese prohibited button'}, {c:'🉑', k:'japanese acceptable button'}, 
                {c:'🈸', k:'japanese application button'}, {c:'🈴', k:'japanese passing grade button'}, {c:'🈳', k:'japanese vacancy button'}, {c:'㊗️', k:'japanese congratulations button'}, 
                {c:'㊙️', k:'japanese secret button'}, {c:'🈺', k:'japanese open for business button'}, {c:'🈵', k:'japanese no vacancy button'}, {c:'🔴', k:'red circle'}, 
                {c:'🟠', k:'orange circle'}, {c:'🟡', k:'yellow circle'}, {c:'🟢', k:'green circle'}, {c:'🔵', k:'blue circle'}, 
                {c:'🟣', k:'purple circle'}, {c:'🟤', k:'brown circle'}, {c:'⚫', k:'black circle'}, {c:'⚪', k:'white circle'}, 
                {c:'🟥', k:'red square'}, {c:'🟧', k:'orange square'}, {c:'🟨', k:'yellow square'}, {c:'🟩', k:'green square'}, 
                {c:'🟦', k:'blue square'}, {c:'🟪', k:'purple square'}, {c:'🟫', k:'brown square'}, {c:'⬛', k:'black large square'}, 
                {c:'⬜', k:'white large square'}, {c:'◼️', k:'black medium square'}, {c:'◻️', k:'white medium square'}, {c:'◾', k:'black medium-small square'}, 
                {c:'◽', k:'white medium-small square'}, {c:'▪️', k:'black small square'}, {c:'▫️', k:'white small square'}, {c:'🔶', k:'large orange diamond'}, 
                {c:'🔷', k:'large blue diamond'}, {c:'🔸', k:'small orange diamond'}, {c:'🔹', k:'small blue diamond'}, {c:'🔺', k:'up-pointing red triangle'}, 
                {c:'🔻', k:'down-pointing red triangle'}, {c:'💠', k:'diamond with a dot'}, {c:'🔘', k:'radio button'}, {c:'🔳', k:'white square button'}, 
                {c:'🔲', k:'black square button'}
            ]},
            { id: 'flags', name: 'Flags', icon: '🏳️', emojis: [
                {c:'🏁', k:'checkered flag'}, {c:'🚩', k:'triangular flag'}, {c:'🎌', k:'crossed flags'}, {c:'🏴', k:'black flag'}, 
                {c:'🏳️', k:'white flag'}, {c:'🏳️‍🌈', k:'rainbow flag'}, {c:'🏳️‍⚧️', k:'transgender flag'}, {c:'🏴‍☠️', k:'pirate flag'}, 
                {c:'🇦🇨', k:'flag: Ascension Island'}, {c:'🇦🇩', k:'flag: Andorra'}, {c:'🇦🇪', k:'flag: United Arab Emirates'}, {c:'🇦🇫', k:'flag: Afghanistan'}, 
                {c:'🇦🇬', k:'flag: Antigua & Barbuda'}, {c:'🇦🇮', k:'flag: Anguilla'}, {c:'🇦🇱', k:'flag: Albania'}, {c:'🇦🇲', k:'flag: Armenia'}, 
                {c:'🇦🇴', k:'flag: Angola'}, {c:'🇦🇶', k:'flag: Antarctica'}, {c:'🇦🇷', k:'flag: Argentina'}, {c:'🇦🇸', k:'flag: American Samoa'}, 
                {c:'🇦🇹', k:'flag: Austria'}, {c:'🇦🇺', k:'flag: Australia'}, {c:'🇦🇼', k:'flag: Aruba'}, {c:'🇦🇽', k:'flag: Åland Islands'}, 
                {c:'🇦🇿', k:'flag: Azerbaijan'}, {c:'🇧🇦', k:'flag: Bosnia & Herzegovina'}, {c:'🇧🇧', k:'flag: Barbados'}, {c:'🇧🇩', k:'flag: Bangladesh'}, 
                {c:'🇧🇪', k:'flag: Belgium'}, {c:'🇧🇫', k:'flag: Burkina Faso'}, {c:'🇧🇬', k:'flag: Bulgaria'}, {c:'🇧🇭', k:'flag: Bahrain'}, 
                {c:'🇧🇮', k:'flag: Burundi'}, {c:'🇧🇯', k:'flag: Benin'}, {c:'🇧🇱', k:'flag: St. Barthélemy'}, {c:'🇧🇲', k:'flag: Bermuda'}, 
                {c:'🇧🇳', k:'flag: Brunei'}, {c:'🇧🇴', k:'flag: Bolivia'}, {c:'🇧🇶', k:'flag: Caribbean Netherlands'}, {c:'🇧🇷', k:'flag: Brazil'}, 
                {c:'🇧🇸', k:'flag: Bahamas'}, {c:'🇧🇹', k:'flag: Bhutan'}, {c:'🇧🇻', k:'flag: Bouvet Island'}, {c:'🇧🇼', k:'flag: Botswana'}, 
                {c:'🇧🇾', k:'flag: Belarus'}, {c:'🇧🇿', k:'flag: Belize'}, {c:'🇨🇦', k:'flag: Canada'}, {c:'🇨🇨', k:'flag: Cocos (Keeling) Islands'}, 
                {c:'🇨🇩', k:'flag: Congo - Kinshasa'}, {c:'🇨🇫', k:'flag: Central African Republic'}, {c:'🇨🇬', k:'flag: Congo - Brazzaville'}, {c:'🇨🇭', k:'flag: Switzerland'}, 
                {c:'🇨🇮', k:'flag: Côte d’Ivoire'}, {c:'🇨🇰', k:'flag: Cook Islands'}, {c:'🇨🇱', k:'flag: Chile'}, {c:'🇨🇲', k:'flag: Cameroon'}, 
                {c:'🇨🇳', k:'flag: China'}, {c:'🇨🇴', k:'flag: Colombia'}, {c:'🇨🇵', k:'flag: Clipperton Island'}, {c:'🇨🇷', k:'flag: Costa Rica'}, 
                {c:'🇨🇺', k:'flag: Cuba'}, {c:'🇨🇻', k:'flag: Cape Verde'}, {c:'🇨🇼', k:'flag: Curaçao'}, {c:'🇨🇽', k:'flag: Christmas Island'}, 
                {c:'🇨🇾', k:'flag: Cyprus'}, {c:'🇨🇿', k:'flag: Czechia'}, {c:'🇩🇪', k:'flag: Germany'}, {c:'🇩🇬', k:'flag: Diego Garcia'}, 
                {c:'🇩🇯', k:'flag: Djibouti'}, {c:'🇩🇰', k:'flag: Denmark'}, {c:'🇩🇲', k:'flag: Dominica'}, {c:'🇩🇴', k:'flag: Dominican Republic'}, 
                {c:'🇩🇿', k:'flag: Algeria'}, {c:'🇪🇦', k:'flag: Ceuta & Melilla'}, {c:'🇪🇨', k:'flag: Ecuador'}, {c:'🇪🇪', k:'flag: Estonia'}, 
                {c:'🇪🇬', k:'flag: Egypt'}, {c:'🇪🇭', k:'flag: Western Sahara'}, {c:'🇪🇷', k:'flag: Eritrea'}, {c:'🇪🇸', k:'flag: Spain'}, 
                {c:'🇪🇹', k:'flag: Ethiopia'}, {c:'🇪🇺', k:'flag: European Union'}, {c:'🇫🇮', k:'flag: Finland'}, {c:'🇫🇯', k:'flag: Fiji'}, 
                {c:'🇫🇰', k:'flag: Falkland Islands'}, {c:'🇫🇲', k:'flag: Micronesia'}, {c:'🇫🇴', k:'flag: Faroe Islands'}, {c:'🇫🇷', k:'flag: France'}, 
                {c:'🇬🇦', k:'flag: Gabon'}, {c:'🇬🇧', k:'flag: United Kingdom'}, {c:'🇬🇩', k:'flag: Grenada'}, {c:'🇬🇪', k:'flag: Georgia'}, 
                {c:'🇬🇫', k:'flag: French Guiana'}, {c:'🇬🇬', k:'flag: Guernsey'}, {c:'🇬🇭', k:'flag: Ghana'}, {c:'🇬🇮', k:'flag: Gibraltar'}, 
                {c:'🇬🇱', k:'flag: Greenland'}, {c:'🇬🇲', k:'flag: Gambia'}, {c:'🇬🇳', k:'flag: Guinea'}, {c:'🇬🇵', k:'flag: Guadeloupe'}, 
                {c:'🇬🇶', k:'flag: Equatorial Guinea'}, {c:'🇬🇷', k:'flag: Greece'}, {c:'🇬🇸', k:'flag: South Georgia & South Sandwich Islands'}, {c:'🇬🇹', k:'flag: Guatemala'}, 
                {c:'🇬🇺', k:'flag: Guam'}, {c:'🇬🇼', k:'flag: Guinea-Bissau'}, {c:'🇬🇾', k:'flag: Guyana'}, {c:'🇭🇰', k:'flag: Hong Kong SAR China'}, 
                {c:'🇭🇲', k:'flag: Heard & McDonald Islands'}, {c:'🇭🇳', k:'flag: Honduras'}, {c:'🇭🇷', k:'flag: Croatia'}, {c:'🇭🇹', k:'flag: Haiti'}, 
                {c:'🇭🇺', k:'flag: Hungary'}, {c:'🇮🇨', k:'flag: Canary Islands'}, {c:'🇮🇩', k:'flag: Indonesia'}, {c:'🇮🇪', k:'flag: Ireland'}, 
                {c:'🇮🇱', k:'flag: Israel'}, {c:'🇮🇲', k:'flag: Isle of Man'}, {c:'🇮🇳', k:'flag: India'}, {c:'🇮🇴', k:'flag: British Indian Ocean Territory'}, 
                {c:'🇮🇶', k:'flag: Iraq'}, {c:'🇮🇷', k:'flag: Iran'}, {c:'🇮🇸', k:'flag: Iceland'}, {c:'🇮🇹', k:'flag: Italy'}, 
                {c:'🇯🇪', k:'flag: Jersey'}, {c:'🇯🇲', k:'flag: Jamaica'}, {c:'🇯🇴', k:'flag: Jordan'}, {c:'🇯🇵', k:'flag: Japan'}, 
                {c:'🇰🇪', k:'flag: Kenya'}, {c:'🇰🇬', k:'flag: Kyrgyzstan'}, {c:'🇰🇭', k:'flag: Cambodia'}, {c:'🇰🇮', k:'flag: Kiribati'}, 
                {c:'🇰🇲', k:'flag: Comoros'}, {c:'🇰🇳', k:'flag: St. Kitts & Nevis'}, {c:'🇰🇵', k:'flag: North Korea'}, {c:'🇰🇷', k:'flag: South Korea'}, 
                {c:'🇰🇼', k:'flag: Kuwait'}, {c:'🇰🇾', k:'flag: Cayman Islands'}, {c:'🇰🇿', k:'flag: Kazakhstan'}, {c:'🇱🇦', k:'flag: Laos'}, 
                {c:'🇱🇧', k:'flag: Lebanon'}, {c:'🇱🇨', k:'flag: St. Lucia'}, {c:'🇱🇮', k:'flag: Liechtenstein'}, {c:'🇱🇰', k:'flag: Sri Lanka'}, 
                {c:'🇱🇷', k:'flag: Liberia'}, {c:'🇱🇸', k:'flag: Lesotho'}, {c:'🇱🇹', k:'flag: Lithuania'}, {c:'🇱🇺', k:'flag: Luxembourg'}, 
                {c:'🇱🇻', k:'flag: Latvia'}, {c:'🇱🇾', k:'flag: Libya'}, {c:'🇲🇦', k:'flag: Morocco'}, {c:'🇲🇨', k:'flag: Monaco'}, 
                {c:'🇲🇩', k:'flag: Moldova'}, {c:'🇲🇪', k:'flag: Montenegro'}, {c:'🇲🇫', k:'flag: St. Martin'}, {c:'🇲🇬', k:'flag: Madagascar'}, 
                {c:'🇲🇭', k:'flag: Marshall Islands'}, {c:'🇲🇰', k:'flag: North Macedonia'}, {c:'🇲🇱', k:'flag: Mali'}, {c:'🇲🇲', k:'flag: Myanmar (Burma)'}, 
                {c:'🇲🇳', k:'flag: Mongolia'}, {c:'🇲🇴', k:'flag: Macao SAR China'}, {c:'🇲🇵', k:'flag: Northern Mariana Islands'}, {c:'🇲🇶', k:'flag: Martinique'}, 
                {c:'🇲🇷', k:'flag: Mauritania'}, {c:'🇲🇸', k:'flag: Montserrat'}, {c:'🇲🇹', k:'flag: Malta'}, {c:'🇲🇺', k:'flag: Mauritius'}, 
                {c:'🇲🇻', k:'flag: Maldives'}, {c:'🇲🇼', k:'flag: Malawi'}, {c:'🇲🇽', k:'flag: Mexico'}, {c:'🇲🇾', k:'flag: Malaysia'}, 
                {c:'🇲🇿', k:'flag: Mozambique'}, {c:'🇳🇦', k:'flag: Namibia'}, {c:'🇳🇨', k:'flag: New Caledonia'}, {c:'🇳🇪', k:'flag: Niger'}, 
                {c:'🇳🇫', k:'flag: Norfolk Island'}, {c:'🇳🇬', k:'flag: Nigeria'}, {c:'🇳🇮', k:'flag: Nicaragua'}, {c:'🇳🇱', k:'flag: Netherlands'}, 
                {c:'🇳🇴', k:'flag: Norway'}, {c:'🇳🇵', k:'flag: Nepal'}, {c:'🇳🇷', k:'flag: Nauru'}, {c:'🇳🇺', k:'flag: Niue'}, 
                {c:'🇳🇿', k:'flag: New Zealand'}, {c:'🇴🇲', k:'flag: Oman'}, {c:'🇵🇦', k:'flag: Panama'}, {c:'🇵🇪', k:'flag: Peru'}, 
                {c:'🇵🇫', k:'flag: French Polynesia'}, {c:'🇵🇬', k:'flag: Papua New Guinea'}, {c:'🇵🇭', k:'flag: Philippines'}, {c:'🇵🇰', k:'flag: Pakistan'}, 
                {c:'🇵🇱', k:'flag: Poland'}, {c:'🇵🇲', k:'flag: St. Pierre & Miquelon'}, {c:'🇵🇳', k:'flag: Pitcairn Islands'}, {c:'🇵🇷', k:'flag: Puerto Rico'}, 
                {c:'🇵🇸', k:'flag: Palestinian Territories'}, {c:'🇵🇹', k:'flag: Portugal'}, {c:'🇵🇼', k:'flag: Palau'}, {c:'🇵🇾', k:'flag: Paraguay'}, 
                {c:'🇶🇦', k:'flag: Qatar'}, {c:'🇷🇪', k:'flag: Réunion'}, {c:'🇷🇴', k:'flag: Romania'}, {c:'🇷🇸', k:'flag: Serbia'}, 
                {c:'🇷🇺', k:'flag: Russia'}, {c:'🇷🇼', k:'flag: Rwanda'}, {c:'🇸🇦', k:'flag: Saudi Arabia'}, {c:'🇸🇧', k:'flag: Solomon Islands'}, 
                {c:'🇸🇨', k:'flag: Seychelles'}, {c:'🇸🇩', k:'flag: Sudan'}, {c:'🇸🇪', k:'flag: Sweden'}, {c:'🇸🇬', k:'flag: Singapore'}, 
                {c:'🇸🇭', k:'flag: St. Helena'}, {c:'🇸🇮', k:'flag: Slovenia'}, {c:'🇸🇯', k:'flag: Svalbard & Jan Mayen'}, {c:'🇸🇰', k:'flag: Slovakia'}, 
                {c:'🇸🇱', k:'flag: Sierra Leone'}, {c:'🇸🇲', k:'flag: San Marino'}, {c:'🇸🇳', k:'flag: Senegal'}, {c:'🇸🇴', k:'flag: Somalia'}, 
                {c:'🇸🇷', k:'flag: Suriname'}, {c:'🇸🇸', k:'flag: South Sudan'}, {c:'🇸🇹', k:'flag: São Tomé & Príncipe'}, {c:'🇸🇻', k:'flag: El Salvador'}, 
                {c:'🇸🇽', k:'flag: Sint Maarten'}, {c:'🇸🇾', k:'flag: Syria'}, {c:'🇸🇿', k:'flag: Eswatini'}, {c:'🇹🇦', k:'flag: Tristan da Cunha'}, 
                {c:'🇹🇨', k:'flag: Turks & Caicos Islands'}, {c:'🇹🇩', k:'flag: Chad'}, {c:'🇹🇫', k:'flag: French Southern Territories'}, {c:'🇹🇬', k:'flag: Togo'}, 
                {c:'🇹🇭', k:'flag: Thailand'}, {c:'🇹🇯', k:'flag: Tajikistan'}, {c:'🇹🇰', k:'flag: Tokelau'}, {c:'🇹🇱', k:'flag: Timor-Leste'}, 
                {c:'🇹🇲', k:'flag: Turkmenistan'}, {c:'🇹🇳', k:'flag: Tunisia'}, {c:'🇹🇴', k:'flag: Tonga'}, {c:'🇹🇷', k:'flag: Turkey'}, 
                {c:'🇹🇹', k:'flag: Trinidad & Tobago'}, {c:'🇹🇻', k:'flag: Tuvalu'}, {c:'🇹🇼', k:'flag: Taiwan'}, {c:'🇹🇿', k:'flag: Tanzania'}, 
                {c:'🇺🇦', k:'flag: Ukraine'}, {c:'🇺🇬', k:'flag: Uganda'}, {c:'🇺🇲', k:'flag: U.S. Outlying Islands'}, {c:'🇺🇳', k:'flag: United Nations'}, 
                {c:'🇺🇸', k:'flag: United States'}, {c:'🇺🇾', k:'flag: Uruguay'}, {c:'🇺🇿', k:'flag: Uzbekistan'}, {c:'🇻🇦', k:'flag: Vatican City'}, 
                {c:'🇻🇨', k:'flag: St. Vincent & Grenadines'}, {c:'🇻🇪', k:'flag: Venezuela'}, {c:'🇻🇬', k:'flag: British Virgin Islands'}, {c:'🇻🇮', k:'flag: U.S. Virgin Islands'}, 
                {c:'🇻🇳', k:'flag: Vietnam'}, {c:'🇻🇺', k:'flag: Vanuatu'}, {c:'🇼🇫', k:'flag: Wallis & Futuna'}, {c:'🇼🇸', k:'flag: Samoa'}, 
                {c:'🇽🇰', k:'flag: Kosovo'}, {c:'🇾🇪', k:'flag: Yemen'}, {c:'🇾🇹', k:'flag: Mayotte'}, {c:'🇿🇦', k:'flag: South Africa'}, 
                {c:'🇿🇲', k:'flag: Zambia'}, {c:'🇿🇼', k:'flag: Zimbabwe'}
            ]}
        ];
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    background: #121212;
                    height: 100%;
                    width: 100%;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    overflow: hidden;
                }
                .ep-header {
                    padding: 8px 12px;
                    border-bottom: 1px solid #262626;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(18,18,18,0.95);
                    flex-shrink: 0; /* Prevent shrinking */
                }
                .ep-search {
                    flex: 1;
                    background: #262626;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 12px;
                    color: #fff;
                    font-size: 14px;
                    outline: none;
                }
                .ep-skin-tone {
                    font-size: 1.2rem;
                    cursor: pointer;
                    user-select: none;
                    filter: grayscale(0.5);
                    transition: filter 0.2s;
                }
                .ep-skin-tone:active { transform: scale(0.9); }
                .ep-nav {
                    display: flex;
                    overflow-x: auto;
                    padding: 6px 4px;
                    border-bottom: 1px solid #262626;
                    gap: 4px;
                    scrollbar-width: none;
                    flex-shrink: 0; /* Prevent shrinking */
                }
                .ep-nav::-webkit-scrollbar { display: none; }
                .ep-nav-item {
                    font-size: 1.2rem;
                    padding: 6px 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: opacity 0.2s, background 0.2s;
                }
                .ep-nav-item.active { opacity: 1; background: #262626; }
                
                .ep-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    scroll-behavior: smooth;
                    /* Ensure content scrolls correctly */
                    height: 0; /* Important flex fix */
                }
                .ep-category-title {
                    font-size: 0.75rem;
                    color: #888;
                    margin: 15px 0 8px 5px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .ep-grid {
                    display: grid;
                    grid-template-columns: repeat(8, 1fr);
                    gap: 8px;
                }
                .ep-emoji {
                    font-size: 1.7rem;
                    cursor: pointer;
                    text-align: center;
                    border-radius: 6px;
                    transition: transform 0.1s, background 0.1s;
                    user-select: none;
                }
                .ep-emoji:active { transform: scale(1.2); background: #333; }
                
                #recents-context {
                    position: absolute; display: none;
                    background: #333; color: white;
                    padding: 8px 12px; border-radius: 8px;
                    font-size: 0.8rem; z-index: 100;
                }
            </style>
            <div class="ep-header">
                <input type="text" class="ep-search" placeholder="Search emoji...">
                <div class="ep-skin-tone">🖐️</div>
            </div>
            <div class="ep-nav" id="nav-bar"></div>
            <div class="ep-body" id="emoji-body"></div>
            <div id="recents-context">Clear Recents</div>
        `;
    }

    setupEvents() {
        const searchInput = this.shadowRoot.querySelector('.ep-search');
        searchInput.addEventListener('input', (e) => this.filterEmojis(e.target.value));

        const skinToneBtn = this.shadowRoot.querySelector('.ep-skin-tone');
        skinToneBtn.addEventListener('click', () => this.toggleSkinTone());

        const recentsBtn = this.shadowRoot.getElementById('recents-context');
        recentsBtn.addEventListener('click', () => {
            this.recentEmojis = [];
            localStorage.setItem('goorac_recents', JSON.stringify([]));
            this.loadEmojis('all');
            recentsBtn.style.display = 'none';
        });
    }

    toggleSkinTone() {
        const tones = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];
        let currentIdx = tones.indexOf(this.skinTone);
        let nextIdx = (currentIdx + 1) % tones.length;
        this.skinTone = tones[nextIdx];
        localStorage.setItem('goorac_skin_tone', this.skinTone);
        
        const toneIcons = ['🖐️', '🖐🏻', '🖐🏼', '🖐🏽', '🖐🏾', '🖐🏿'];
        this.shadowRoot.querySelector('.ep-skin-tone').innerText = toneIcons[nextIdx];
        
        this.loadEmojis('all'); 
    }

    applySkinTone(emoji, hasSkin) {
        if (!hasSkin || !this.skinTone) return emoji;
        return emoji + this.skinTone;
    }

    loadEmojis(filter) {
        const navBar = this.shadowRoot.getElementById('nav-bar');
        const body = this.shadowRoot.getElementById('emoji-body');
        
        navBar.innerHTML = '';
        body.innerHTML = '';

        let displayData = [...this.emojiData];
        if (this.recentEmojis.length > 0) {
            displayData.unshift({
                id: 'recents', name: 'Recent', icon: '🕒', 
                emojis: this.recentEmojis.map(e => ({c: e, k: 'recent'})) 
            });
        }

        displayData.forEach(cat => {
            if(cat.id === 'recents' && this.recentEmojis.length === 0) return;
            const span = document.createElement('span');
            span.className = 'ep-nav-item';
            span.innerText = cat.icon;
            span.onclick = () => {
                const el = this.shadowRoot.getElementById(`cat-${cat.id}`);
                if(el) el.scrollIntoView({block: 'start'});
                this.shadowRoot.querySelectorAll('.ep-nav-item').forEach(i => i.classList.remove('active'));
                span.classList.add('active');
            };
            navBar.appendChild(span);
        });

        displayData.forEach(cat => {
            const catContainer = document.createElement('div');
            catContainer.id = `cat-${cat.id}`;
            
            const title = document.createElement('div');
            title.className = 'ep-category-title';
            title.innerText = cat.name;
            
            if(cat.id === 'recents') {
                 title.addEventListener('contextmenu', (e) => {
                     e.preventDefault();
                     const ctx = this.shadowRoot.getElementById('recents-context');
                     ctx.style.display = 'block';
                     ctx.style.left = e.offsetX + 'px';
                     ctx.style.top = e.offsetY + 'px';
                 });
            }

            const grid = document.createElement('div');
            grid.className = 'ep-grid';

            cat.emojis.forEach(eObj => {
                const el = document.createElement('div');
                el.className = 'ep-emoji';
                const finalEmoji = eObj.s ? this.applySkinTone(eObj.c, true) : eObj.c;
                el.innerText = finalEmoji;
                el.onclick = () => {
                    this.addToRecents(eObj.c); 
                    this.dispatchEvent(new CustomEvent('emoji-click', { 
                        detail: { emoji: finalEmoji, unicode: finalEmoji },
                        bubbles: true, 
                        composed: true 
                    }));
                };
                grid.appendChild(el);
            });

            catContainer.appendChild(title);
            catContainer.appendChild(grid);
            body.appendChild(catContainer);
        });
    }

    filterEmojis(query) {
        const body = this.shadowRoot.getElementById('emoji-body');
        body.innerHTML = '';
        if(!query) {
            this.loadEmojis('all');
            return;
        }
        
        const grid = document.createElement('div');
        grid.className = 'ep-grid';
        grid.style.marginTop = '10px';

        let count = 0;
        this.emojiData.forEach(cat => {
            cat.emojis.forEach(e => {
                if(count > 100) return; 
                if(e.k.includes(query.toLowerCase()) || e.c === query) {
                    const el = document.createElement('div');
                    el.className = 'ep-emoji';
                    const finalEmoji = e.s ? this.applySkinTone(e.c, true) : e.c;
                    el.innerText = finalEmoji;
                    el.onclick = () => {
                        this.addToRecents(e.c);
                        this.dispatchEvent(new CustomEvent('emoji-click', { detail: { emoji: finalEmoji } }));
                    };
                    grid.appendChild(el);
                    count++;
                }
            });
        });
        body.appendChild(grid);
    }

    addToRecents(char) {
        this.recentEmojis = this.recentEmojis.filter(e => e !== char);
        this.recentEmojis.unshift(char);
        if(this.recentEmojis.length > 24) this.recentEmojis.pop();
        localStorage.setItem('goorac_recents', JSON.stringify(this.recentEmojis));
    }
}

customElements.define('emoji-picker', EmojiPicker);
