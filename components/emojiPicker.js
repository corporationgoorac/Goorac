class EmojiPicker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.skinTone = localStorage.getItem('goorac_skin_tone') || '';
        this.recentEmojis = JSON.parse(localStorage.getItem('goorac_recents')) || [];
        this.emojiData = this.getComprehensiveEmojiData();
        this.activeFilter = '';
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        this.loadEmojis('all');
    }

    getComprehensiveEmojiData() {
        return [
            { id: 'smileys', name: 'Smileys & Emotion', icon: '😀', emojis: [
                {c:'😀', k:'smile happy'}, {c:'😃', k:'smile happy'}, {c:'😄', k:'smile happy'}, {c:'😁', k:'grin'}, {c:'😆', k:'laugh'}, {c:'😅', k:'sweat smile'}, 
                {c:'🤣', k:'rofl'}, {c:'😂', k:'joy'}, {c:'🙂', k:'smile'}, {c:'🙃', k:'upside down'}, {c:'😉', k:'wink'}, {c:'😊', k:'blush'}, 
                {c:'😇', k:'halo'}, {c:'🥰', k:'love'}, {c:'😍', k:'heart eyes'}, {c:'🤩', k:'star eyes'}, {c:'😘', k:'kiss'}, {c:'😗', k:'kiss'}, 
                {c:'☺️', k:'smile'}, {c:'😚', k:'kiss'}, {c:'😙', k:'kiss'}, {c:'😋', k:'yum'}, {c:'😛', k:'tongue'}, {c:'😜', k:'wink tongue'}, 
                {c:'🤪', k:'zany'}, {c:'😝', k:'squint tongue'}, {c:'🤑', k:'money'}, {c:'🤗', k:'hugs'}, {c:'🤭', k:'hand mouth'}, {c:'🤫', k:'shh'}, 
                {c:'🤔', k:'think'}, {c:'🤐', k:'zipper'}, {c:'🤨', k:'eyebrow'}, {c:'😐', k:'neutral'}, {c:'😑', k:'expressionless'}, {c:'😶', k:'no mouth'}, 
                {c:'😏', k:'smirk'}, {c:'😒', k:'unamused'}, {c:'🙄', k:'roll eyes'}, {c:'😬', k:'grimace'}, {c:'🤥', k:'lying'}, {c:'😌', k:'relieved'}, 
                {c:'😔', k:'pensive'}, {c:'😪', k:'sleepy'}, {c:'🤤', k:'drool'}, {c:'😴', k:'sleep'}, {c:'😷', k:'mask'}, {c:'🤒', k:'thermometer'}, 
                {c:'🤕', k:'bandage'}, {c:'🤢', k:'nauseated'}, {c:'🤮', k:'vomit'}, {c:'🤧', k:'sneeze'}, {c:'🥵', k:'hot'}, {c:'🥶', k:'cold'}, 
                {c:'🥴', k:'woozy'}, {c:'😵', k:'dizzy'}, {c:'🤯', k:'explode'}, {c:'🤠', k:'cowboy'}, {c:'🥳', k:'party'}, {c:'😎', k:'cool'}, 
                {c:'🤓', k:'nerd'}, {c:'🧐', k:'monocle'}, {c:'😕', k:'confused'}, {c:'😟', k:'worried'}, {c:'🙁', k:'frown'}, {c:'😮', k:'open mouth'}, 
                {c:'😯', k:'hushed'}, {c:'😲', k:'astonished'}, {c:'😳', k:'flushed'}, {c:'🥺', k:'pleading'}, {c:'😦', k:'frowning'}, {c:'😧', k:'anguished'}, 
                {c:'😨', k:'fearful'}, {c:'😰', k:'cold sweat'}, {c:'😥', k:'disappointed'}, {c:'😢', k:'cry'}, {c:'😭', k:'sob'}, {c:'😱', k:'scream'}, 
                {c:'😖', k:'confounded'}, {c:'😣', k:'persevering'}, {c:'😞', k:'disappointed'}, {c:'😓', k:'sweat'}, {c:'😩', k:'weary'}, {c:'😫', k:'tired'}, 
                {c:'🥱', k:'yawn'}, {c:'😤', k:'triumph'}, {c:'😡', k:'pout'}, {c:'😠', k:'angry'}, {c:'🤬', k:'cursing'}, {c:'😈', k:'devil'}, 
                {c:'👿', k:'devil angry'}, {c:'💀', k:'skull'}, {c:'☠️', k:'skull bones'}, {c:'💩', k:'poop'}, {c:'🤡', k:'clown'}, {c:'👹', k:'ogre'}, 
                {c:'👺', k:'goblin'}, {c:'👻', k:'ghost'}, {c:'👽', k:'alien'}, {c:'👾', k:'monster'}, {c:'🤖', k:'robot'}, {c:'😺', k:'cat smile'}, 
                {c:'😸', k:'cat grin'}, {c:'😹', k:'cat joy'}, {c:'😻', k:'cat love'}, {c:'😼', k:'cat wry'}, {c:'😽', k:'cat kiss'}, {c:'🙀', k:'cat scream'}, 
                {c:'😿', k:'cat crying'}, {c:'😾', k:'cat pout'}, {c:'💋', k:'kiss mark'}, {c:'👋', k:'wave', s:1}, {c:'🤚', k:'back hand', s:1}, 
                {c:'🖐️', k:'fingers splayed', s:1}, {c:'✋', k:'hand', s:1}, {c:'🖖', k:'vulcan', s:1}, {c:'👌', k:'ok', s:1}, {c:'🤌', k:'pinched fingers', s:1}, 
                {c:'🤏', k:'pinching', s:1}, {c:'✌️', k:'victory', s:1}, {c:'🤞', k:'crossed', s:1}, {c:'🤟', k:'love you', s:1}, {c:'🤘', k:'rock', s:1}, 
                {c:'🤙', k:'call me', s:1}, {c:'👈', k:'point left', s:1}, {c:'👉', k:'point right', s:1}, {c:'👆', k:'point up', s:1}, {c:'🖕', k:'middle finger', s:1}, 
                {c:'👇', k:'point down', s:1}, {c:'☝️', k:'index up', s:1}, {c:'👍', k:'thumbs up', s:1}, {c:'👎', k:'thumbs down', s:1}, {c:'✊', k:'fist', s:1}, 
                {c:'👊', k:'punch', s:1}, {c:'🤛', k:'left fist', s:1}, {c:'🤜', k:'right fist', s:1}, {c:'👏', k:'clap', s:1}, {c:'🙌', k:'hands up', s:1}, 
                {c:'👐', k:'open hands', s:1}, {c:'🤲', k:'palms up', s:1}, {c:'🤝', k:'handshake', s:1}, {c:'🙏', k:'pray', s:1}, {c:'✍️', k:'write', s:1}, 
                {c:'💅', k:'nail polish', s:1}, {c:'🤳', k:'selfie', s:1}, {c:'💪', k:'muscle', s:1}, {c:'🦵', k:'leg', s:1}, {c:'🦶', k:'foot', s:1}, 
                {c:'👂', k:'ear', s:1}, {c:'🦻', k:'hearing aid', s:1}, {c:'👃', k:'nose', s:1}, {c:'🧠', k:'brain'}, {c:'🫀', k:'anatomical heart'}, 
                {c:'🫁', k:'lungs'}, {c:'🦷', k:'tooth'}, {c:'🦴', k:'bone'}, {c:'👀', k:'eyes'}, {c:'👁️', k:'eye'}, {c:'👅', k:'tongue'}, {c:'👄', k:'mouth'}
            ]},
            { id: 'people', name: 'People', icon: '👤', emojis: [
                {c:'👶', k:'baby', s:1}, {c:'🧒', k:'child', s:1}, {c:'👦', k:'boy', s:1}, {c:'👧', k:'girl', s:1}, {c:'🧑', k:'person', s:1}, 
                {c:'👱', k:'blond', s:1}, {c:'👨', k:'man', s:1}, {c:'🧔', k:'beard', s:1}, {c:'👨‍🦰', k:'red hair', s:1}, {c:'👨‍🦱', k:'curly hair', s:1}, 
                {c:'👨‍🦳', k:'white hair', s:1}, {c:'👨‍🦲', k:'bald', s:1}, {c:'👩', k:'woman', s:1}, {c:'👩‍🦰', k:'red hair', s:1}, {c:'👩‍🦱', k:'curly hair', s:1}, 
                {c:'👩‍🦳', k:'white hair', s:1}, {c:'👩‍🦲', k:'bald', s:1}, {c:'🧓', k:'older person', s:1}, {c:'👴', k:'old man', s:1}, {c:'👵', k:'old woman', s:1}, 
                {c:'🙍', k:'frowning person', s:1}, {c:'🙎', k:'pouting person', s:1}, {c:'🙅', k:'no gesture', s:1}, {c:'🙆', k:'ok gesture', s:1}, 
                {c:'💁', k:'tipping hand', s:1}, {c:'🙋', k:'raising hand', s:1}, {c:'🙇', k:'bowing', s:1}, {c:'🤦', k:'facepalm', s:1}, {c:'🤷', k:'shrug', s:1}, 
                {c:'👨‍⚕️', k:'health worker', s:1}, {c:'👨‍🎓', k:'student', s:1}, {c:'👨‍🏫', k:'teacher', s:1}, {c:'👨‍⚖️', k:'judge', s:1}, {c:'👨‍🌾', k:'farmer', s:1}, 
                {c:'👨‍🍳', k:'cook', s:1}, {c:'👨‍🔧', k:'mechanic', s:1}, {c:'👨‍🏭', k:'factory worker', s:1}, {c:'👨‍💼', k:'office worker', s:1}, {c:'👨‍🔬', k:'scientist', s:1}, 
                {c:'👨‍💻', k:'technologist', s:1}, {c:'👨‍🎤', k:'singer', s:1}, {c:'👨‍🎨', k:'artist', s:1}, {c:'👨‍✈️', k:'pilot', s:1}, {c:'👨‍🚀', k:'astronaut', s:1}, 
                {c:'👨‍🚒', k:'firefighter', s:1}, {c:'👮', k:'police', s:1}, {c:'🕵️', k:'detective', s:1}, {c:'💂', k:'guard', s:1}, {c:'👷', k:'construction', s:1}, 
                {c:'🤴', k:'prince', s:1}, {c:'👸', k:'princess', s:1}, {c:'👳', k:'turban', s:1}, {c:'👲', k:'cap', s:1}, {c:'🧕', k:'headscarf', s:1}, 
                {c:'🤵', k:'tuxedo', s:1}, {c:'👰', k:'veil', s:1}, {c:'🤰', k:'pregnant', s:1}, {c:'🤱', k:'breast feeding', s:1}, {c:'👼', k:'angel', s:1}, 
                {c:'🎅', k:'santa', s:1}, {c:'🧛', k:'vampire', s:1}, {c:'🧟', k:'zombie', s:1}, {c:'🧞', k:'genie', s:1}, {c:'🧜', k:'merperson', s:1}, 
                {c:'🧚', k:'fairy', s:1}, {c:'🚶', k:'walking', s:1}, {c:'🧍', k:'standing', s:1}, {c:'🧎', k:'kneeling', s:1}, {c:'🏃', k:'running', s:1}, 
                {c:'💃', k:'dancing', s:1}, {c:'🕺', k:'man dancing', s:1}, {c:'👯', k:'people dancing', s:1}, {c:'🧖', k:'steamy room', s:1}, {c:'🧘', k:'yoga', s:1}
            ]},
            { id: 'nature', name: 'Nature', icon: '🐻', emojis: [
                {c:'🐶', k:'dog'}, {c:'🐱', k:'cat'}, {c:'🐭', k:'mouse'}, {c:'🐹', k:'hamster'}, {c:'🐰', k:'rabbit'}, {c:'🦊', k:'fox'}, 
                {c:'🐻', k:'bear'}, {c:'🐼', k:'panda'}, {c:'🐨', k:'koala'}, {c:'🐯', k:'tiger'}, {c:'🦁', k:'lion'}, {c:'🐮', k:'cow'}, 
                {c:'🐷', k:'pig'}, {c:'🐽', k:'pig nose'}, {c:'🐸', k:'frog'}, {c:'🐵', k:'monkey'}, {c:'🙈', k:'see no evil'}, {c:'🙉', k:'hear no evil'}, 
                {c:'🙊', k:'speak no evil'}, {c:'🐒', k:'monkey'}, {c:'🐔', k:'chicken'}, {c:'🐧', k:'penguin'}, {c:'🐦', k:'bird'}, {c:'🐤', k:'chick'}, 
                {c:'🐣', k:'hatching chick'}, {c:'🐥', k:'front chick'}, {c:'🦆', k:'duck'}, {c:'🦅', k:'eagle'}, {c:'🦉', k:'owl'}, {c:'🦇', k:'bat'}, 
                {c:'🐺', k:'wolf'}, {c:'🐗', k:'boar'}, {c:'🐴', k:'horse'}, {c:'🦄', k:'unicorn'}, {c:'🐝', k:'bee'}, {c:'🐛', k:'bug'}, 
                {c:'🦋', k:'butterfly'}, {c:'🐌', k:'snail'}, {c:'🐚', k:'shell'}, {c:'🐞', k:'beetle'}, {c:'🐜', k:'ant'}, {c:'🦗', k:'cricket'}, 
                {c:'🕷️', k:'spider'}, {c:'🕸️', k:'web'}, {c:'🦂', k:'scorpion'}, {c:'🦟', k:'mosquito'}, {c:'🦠', k:'microbe'}, {c:'🐢', k:'turtle'}, 
                {c:'🐍', k:'snake'}, {c:'🦎', k:'lizard'}, {c:'🦖', k:'t-rex'}, {c:'🦕', k:'sauropod'}, {c:'🐙', k:'octopus'}, {c:'🦑', k:'squid'}, 
                {c:'🦐', k:'shrimp'}, {c:'🦞', k:'lobster'}, {c:'🦀', k:'crab'}, {c:'🐡', k:'blowfish'}, {c:'🐠', k:'tropical fish'}, {c:'🐟', k:'fish'}, 
                {c:'🐬', k:'dolphin'}, {c:'🐳', k:'whale'}, {c:'🐋', k:'spouting whale'}, {c:'🦈', k:'shark'}, {c:'🐊', k:'crocodile'}, {c:'🐅', k:'tiger full'}, 
                {c:'🐆', k:'leopard'}, {c:'🦓', k:'zebra'}, {c:'🦍', k:'gorilla'}, {c:'🦧', k:'orangutan'}, {c:'🐘', k:'elephant'}, {c:'🦛', k:'hippo'}, 
                {c:'🦏', k:'rhino'}, {c:'🐪', k:'camel'}, {c:'🐫', k:'two-hump camel'}, {c:'🦒', k:'giraffe'}, {c:'🦘', k:'kangaroo'}, {c:'🐃', k:'water buffalo'}, 
                {c:'🐂', k:'ox'}, {c:'🐄', k:'bull'}, {c:'🐎', k:'horse full'}, {c:'🐖', k:'pig full'}, {c:'🐏', k:'ram'}, {c:'🐑', k:'sheep'}, 
                {c:'🦙', k:'llama'}, {c:'🐐', k:'goat'}, {c:'🦌', k:'deer'}, {c:'🐕', k:'dog full'}, {c:'🐩', k:'poodle'}, {c:'🦮', k:'guide dog'}, 
                {c:'🐕‍🦺', k:'service dog'}, {c:'🐈', k:'cat full'}, {c:'🐓', k:'rooster'}, {c:'🦃', k:'turkey'}, {c:'🦚', k:'peacock'}, {c:'🦜', k:'parrot'}, 
                {c:'🦢', k:'swan'}, {c:'🦩', k:'flamingo'}, {c:'🕊️', k:'dove'}, {c:'🐇', k:'rabbit full'}, {c:'🦝', k:'raccoon'}, {c:'🦨', k:'skunk'}, 
                {c:'🦡', k:'badger'}, {c:'🦦', k:'otter'}, {c:'🦥', k:'sloth'}, {c:'🐁', k:'mouse full'}, {c:'🐀', k:'rat'}, {c:'🐿️', k:'chipmunk'}, 
                {c:'🦔', k:'hedgehog'}, {c:'🐾', k:'paw prints'}, {c:'🐉', k:'dragon'}, {c:'🐲', k:'dragon face'}, {c:'🌵', k:'cactus'}, {c:'🎄', k:'christmas tree'}, 
                {c:'🌲', k:'evergreen'}, {c:'🌳', k:'deciduous'}, {c:'🌴', k:'palm'}, {c:'🌱', k:'seedling'}, {c:'🌿', k:'herb'}, {c:'☘️', k:'shamrock'}, 
                {c:'🍀', k:'four leaf'}, {c:'🎍', k:'bamboo'}, {c:'🎋', k:'tanabata'}, {c:'🍃', k:'wind'}, {c:'🍂', k:'fallen leaf'}, {c:'🍁', k:'maple'}, 
                {c:'🍄', k:'mushroom'}, {c:'🌾', k:'sheaf'}, {c:'💐', k:'bouquet'}, {c:'🌷', k:'tulip'}, {c:'🌹', k:'rose'}, {c:'🥀', k:'wilted flower'}, 
                {c:'🌺', k:'hibiscus'}, {c:'🌸', k:'cherry blossom'}, {c:'🌼', k:'blossom'}, {c:'🌻', k:'sunflower'}, {c:'🌞', k:'sun face'}, {c:'🌝', k:'full sun'}, 
                {c:'🌛', k:'full moon face'}, {c:'🌜', k:'last quarter'}, {c:'🌚', k:'new moon face'}, {c:'🌕', k:'full moon'}, {c:'🌖', k:'waning gibbous'}, 
                {c:'🌗', k:'last quarter'}, {c:'🌘', k:'waning crescent'}, {c:'🌑', k:'new moon'}, {c:'🌒', k:'waxing crescent'}, {c:'🌓', k:'first quarter'}, 
                {c:'🌔', k:'waxing gibbous'}, {c:'🌙', k:'crescent'}, {c:'🌎', k:'earth americas'}, {c:'🌍', k:'earth africa'}, {c:'🌏', k:'earth asia'}, 
                {c:'🪐', k:'planet'}, {c:'💫', k:'dizzy'}, {c:'⭐', k:'star'}, {c:'🌟', k:'glowing star'}, {c:'✨', k:'sparkles'}, {c:'⚡', k:'zap'}, 
                {c:'☄️', k:'comet'}, {c:'🔥', k:'fire'}, {c:'🌊', k:'wave'}, {c:'💧', k:'droplet'}
            ]},
            { id: 'food', name: 'Food', icon: '🍔', emojis: [
                {c:'🍇', k:'grapes'}, {c:'🍈', k:'melon'}, {c:'🍉', k:'watermelon'}, {c:'🍊', k:'tangerine'}, {c:'🍋', k:'lemon'}, {c:'🍌', k:'banana'}, 
                {c:'🍍', k:'pineapple'}, {c:'🥭', k:'mango'}, {c:'🍎', k:'apple red'}, {c:'🍏', k:'apple green'}, {c:'🍐', k:'pear'}, {c:'🍑', k:'peach'}, 
                {c:'🍒', k:'cherries'}, {c:'🍓', k:'strawberry'}, {c:'🥝', k:'kiwi'}, {c:'🍅', k:'tomato'}, {c:'🥥', k:'coconut'}, {c:'🥑', k:'avocado'}, 
                {c:'🍆', k:'eggplant'}, {c:'🥔', k:'potato'}, {c:'🥕', k:'carrot'}, {c:'🌽', k:'corn'}, {c:'🌶️', k:'hot pepper'}, {c:'🥒', k:'cucumber'}, 
                {c:'🥬', k:'leafy green'}, {c:'🥦', k:'broccoli'}, {c:'🧄', k:'garlic'}, {c:'🧅', k:'onion'}, {c:'🍄', k:'mushroom'}, {c:'🥜', k:'peanuts'}, 
                {c:'🌰', k:'chestnut'}, {c:'🍞', k:'bread'}, {c:'🥐', k:'croissant'}, {c:'🥖', k:'baguette'}, {c:'🥨', k:'pretzel'}, {c:'🥯', k:'bagel'}, 
                {c:'🥞', k:'pancakes'}, {c:'🧇', k:'waffle'}, {c:'🧀', k:'cheese'}, {c:'🍖', k:'meat'}, {c:'🍗', k:'poultry'}, {c:'🥩', k:'steak'}, 
                {c:'🥓', k:'bacon'}, {c:'🍔', k:'hamburger'}, {c:'🍟', k:'fries'}, {c:'🍕', k:'pizza'}, {c:'🌭', k:'hot dog'}, {c:'🥪', k:'sandwich'}, 
                {c:'🌮', k:'taco'}, {c:'🌯', k:'burrito'}, {c:'🥙', k:'stuffed flatbread'}, {c:'🧆', k:'falafel'}, {c:'🥚', k:'egg'}, {c:'🍳', k:'cooking'}, 
                {c:'🥘', k:'pan food'}, {c:'🍲', k:'pot food'}, {c:'🥣', k:'bowl'}, {c:'🥗', k:'salad'}, {c:'🍿', k:'popcorn'}, {c:'🧈', k:'butter'}, 
                {c:'🧂', k:'salt'}, {c:'🥫', k:'canned'}, {c:'🍱', k:'bento'}, {c:'🍘', k:'cracker'}, {c:'🍙', k:'rice ball'}, {c:'🍚', k:'cooked rice'}, 
                {c:'🍛', k:'curry'}, {c:'🍜', k:'noodle'}, {c:'🍝', k:'spaghetti'}, {c:'🍠', k:'roasted potato'}, {c:'🍢', k:'oden'}, {c:'🍣', k:'sushi'}, 
                {c:'🍤', k:'fried shrimp'}, {c:'🍥', k:'fish cake'}, {c:'🥮', k:'moon cake'}, {c:'🍡', k:'dango'}, {c:'🥟', k:'dumpling'}, {c:'🥠', k:'fortune cookie'}, 
                {c:'🥡', k:'takeout'}, {c:'🦀', k:'crab'}, {c:'🦞', k:'lobster'}, {c:'🦐', k:'shrimp'}, {c:'🦑', k:'squid'}, {c:'🦪', k:'oyster'}, 
                {c:'🍦', k:'ice cream'}, {c:'🍧', k:'shaved ice'}, {c:'🍨', k:'ice cream'}, {c:'🍩', k:'doughnut'}, {c:'🍪', k:'cookie'}, {c:'🎂', k:'cake'}, 
                {c:'🍰', k:'shortcake'}, {c:'🧁', k:'cupcake'}, {c:'🥧', k:'pie'}, {c:'🍫', k:'chocolate'}, {c:'🍬', k:'candy'}, {c:'🍭', k:'lollipop'}, 
                {c:'🍮', k:'custard'}, {c:'🍯', k:'honey'}, {c:'🍼', k:'baby bottle'}, {c:'🥛', k:'milk'}, {c:'☕', k:'coffee'}, {c:'🍵', k:'tea'}, 
                {c:'🍶', k:'sake'}, {c:'🍾', k:'champagne'}, {c:'🍷', k:'wine'}, {c:'🍸', k:'cocktail'}, {c:'🍹', k:'tropical'}, {c:'🍺', k:'beer'}, 
                {c:'🍻', k:'beers'}, {c:'🥂', k:'clinking'}, {c:'🥃', k:'whiskey'}, {c:'🥤', k:'cup'}, {c:'🧃', k:'juice'}, {c:'🧉', k:'mate'}, {c:'🧊', k:'ice'}
            ]},
            { id: 'activity', name: 'Activity', icon: '⚽', emojis: [
                {c:'⚽', k:'soccer'}, {c:'🏀', k:'basketball'}, {c:'🏈', k:'football'}, {c:'⚾', k:'baseball'}, {c:'🥎', k:'softball'}, {c:'🎾', k:'tennis'}, 
                {c:'🏐', k:'volleyball'}, {c:'🏉', k:'rugby'}, {c:'🥏', k:'frisbee'}, {c:'🎱', k:'pool'}, {c:'🪀', k:'yo-yo'}, {c:'🏓', k:'ping pong'}, 
                {c:'🏸', k:'badminton'}, {c:'🏒', k:'hockey'}, {c:'🏑', k:'field hockey'}, {c:'🥍', k:'lacrosse'}, {c:'🏏', k:'cricket'}, {c:'🥅', k:'goal'}, 
                {c:'⛳', k:'golf'}, {c:'🪁', k:'kite'}, {c:'🏹', k:'archery'}, {c:'🎣', k:'fishing'}, {c:'🤿', k:'diving'}, {c:'🥊', k:'boxing'}, 
                {c:'🥋', k:'martial arts'}, {c:'🎽', k:'shirt'}, {c:'🛹', k:'skateboard'}, {c:'🛼', k:'roller skate'}, {c:'🛷', k:'sled'}, {c:'⛸️', k:'ice skate'}, 
                {c:'🥌', k:'curling'}, {c:'🎿', k:'ski'}, {c:'⛷️', k:'skier'}, {c:'🏂', k:'snowboarder'}, {c:'🪂', k:'parachute'}, {c:'🏋️', k:'weight lifting'}, 
                {c:'🤼', k:'wrestling'}, {c:'🤸', k:'cartwheel'}, {c:'⛹️', k:'bouncing'}, {c:'🤺', k:'fencing'}, {c:'🤾', k:'handball'}, {c:'🏌️', k:'golfing'}, 
                {c:'🏇', k:'horse racing'}, {c:'🧘', k:'yoga'}, {c:'🏄', k:'surfing'}, {c:'🏊', k:'swimming'}, {c:'🤽', k:'water polo'}, {c:'🚣', k:'rowing'}, 
                {c:'🧗', k:'climbing'}, {c:'🚵', k:'biking'}, {c:'🚴', k:'cyclist'}, {c:'🏆', k:'trophy'}, {c:'🥇', k:'1st'}, {c:'🥈', k:'2nd'}, {c:'🥉', k:'3rd'}, 
                {c:'🏅', k:'medal'}, {c:'🎖️', k:'military'}, {c:'🎗️', k:'reminder'}, {c:'🎫', k:'ticket'}, {c:'🎟️', k:'admission'}, {c:'🎪', k:'circus'}, 
                {c:'🤹', k:'juggling'}, {c:'🎭', k:'performing arts'}, {c:'🎨', k:'art'}, {c:'🎬', k:'clapper board'}, {c:'🎤', k:'microphone'}, {c:'🎧', k:'headphone'}, 
                {c:'🎼', k:'score'}, {c:'🎹', k:'musical keyboard'}, {c:'🥁', k:'drum'}, {c:'🎷', k:'sax'}, {c:'🎺', k:'trumpet'}, {c:'🎸', k:'guitar'}, 
                {c:'🪕', k:'banjo'}, {c:'🎻', k:'violin'}, {c:'🎲', k:'game die'}, {c:'♟️', k:'pawn'}, {c:'🎯', k:'bullseye'}, {c:'🎳', k:'bowling'}, 
                {c:'🎮', k:'game controller'}, {c:'🎰', k:'slot machine'}, {c:'🧩', k:'puzzle'}
            ]},
            { id: 'objects', name: 'Objects', icon: '💡', emojis: [
                {c:'👟', k:'shoe running'}, {c:'👞', k:'shoe men'}, {c:'🥾', k:'hiking boot'}, {c:'🥿', k:'flat shoe'}, {c:'👠', k:'high heel'}, 
                {c:'👡', k:'sandal'}, {c:'🩰', k:'ballet'}, {c:'👢', k:'boot'}, {c:'🕶️', k:'sunglasses'}, {c:'👓', k:'glasses'}, {c:'🥽', k:'goggles'}, 
                {c:'🥼', k:'lab coat'}, {c:'🦺', k:'safety vest'}, {c:'👔', k:'tie'}, {c:'👕', k:'t-shirt'}, {c:'👖', k:'jeans'}, {c:'🧣', k:'scarf'}, 
                {c:'🧤', k:'gloves'}, {c:'🧥', k:'coat'}, {c:'🧦', k:'socks'}, {c:'👗', k:'dress'}, {c:'👘', k:'kimono'}, {c:'🥻', k:'sari'}, 
                {c:'🩱', k:'swimsuit'}, {c:'🩲', k:'briefs'}, {c:'🩳', k:'shorts'}, {c:'👙', k:'bikini'}, {c:'👚', k:'clothes'}, {c:'👛', k:'purse'}, 
                {c:'👜', k:'handbag'}, {c:'👝', k:'pouch'}, {c:'🛍️', k:'shopping'}, {c:'🎒', k:'backpack'}, {c:'👑', k:'crown'}, {c:'👒', k:'hat'}, 
                {c:'🎩', k:'top hat'}, {c:'🎓', k:'grad cap'}, {c:'🧢', k:'cap'}, {c:'⛑️', k:'helmet'}, {c:'📿', k:'beads'}, {c:'💄', k:'lipstick'}, 
                {c:'💍', k:'ring'}, {c:'💎', k:'gem'}, {c:'⌚', k:'watch'}, {c:'📱', k:'mobile'}, {c:'💻', k:'computer'}, {c:'⌨️', k:'keyboard'}, 
                {c:'🖥️', k:'desktop'}, {c:'🖨️', k:'printer'}, {c:'🖱️', k:'mouse'}, {c:'🖲️', k:'trackball'}, {c:'🕹️', k:'joystick'}, {c:'🗜️', k:'clamp'}, 
                {c:'💽', k:'minidisc'}, {c:'💾', k:'floppy'}, {c:'💿', k:'cd'}, {c:'📀', k:'dvd'}, {c:'📼', k:'vhs'}, {c:'📷', k:'camera'}, 
                {c:'📸', k:'flash'}, {c:'📹', k:'video'}, {c:'🎥', k:'movie'}, {c:'📽️', k:'projector'}, {c:'🎞️', k:'film'}, {c:'📞', k:'telephone'}, 
                {c:'☎️', k:'phone'}, {c:'📟', k:'pager'}, {c:'📠', k:'fax'}, {c:'📺', k:'tv'}, {c:'📻', k:'radio'}, {c:'🎙️', k:'mic'}, 
                {c:'🎚️', k:'level'}, {c:'🎛️', k:'knobs'}, {c:'🧭', k:'compass'}, {c:'⏱️', k:'stopwatch'}, {c:'⏲️', k:'timer'}, {c:'⏰', k:'clock'}, 
                {c:'🕰️', k:'mantelpiece'}, {c:'⌛', k:'hourglass'}, {c:'⏳', k:'sand'}, {c:'📡', k:'satellite'}, {c:'🔋', k:'battery'}, {c:'🔌', k:'plug'}, 
                {c:'💡', k:'bulb'}, {c:'🔦', k:'flashlight'}, {c:'🕯️', k:'candle'}, {c:'🪔', k:'diya'}, {c:'🧱', k:'brick'}, {c:'🧯', k:'extinguisher'}, 
                {c:'🛢️', k:'oil'}, {c:'💸', k:'money'}, {c:'💵', k:'dollar'}, {c:'💴', k:'yen'}, {c:'💶', k:'euro'}, {c:'💷', k:'pound'}, 
                {c:'💰', k:'moneybag'}, {c:'💳', k:'credit'}, {c:'⚖️', k:'scale'}, {c:'🧰', k:'toolbox'}, {c:'🔧', k:'wrench'}, {c:'🔨', k:'hammer'}, 
                {c:'⚒️', k:'hammer pick'}, {c:'🛠️', k:'tools'}, {c:'⛏️', k:'pick'}, {c:'🔩', k:'bolt'}, {c:'⚙️', k:'gear'}, {c:'⛓️', k:'chains'}, 
                {c:'🔫', k:'pistol'}, {c:'💣', k:'bomb'}, {c:'🧨', k:'firecracker'}, {c:'🪓', k:'axe'}, {c:'🔪', k:'knife'}, {c:'🗡️', k:'dagger'}, 
                {c:'⚔️', k:'swords'}, {c:'🛡️', k:'shield'}, {c:'🚬', k:'smoking'}, {c:'⚰️', k:'coffin'}, {c:'⚱️', k:'urn'}, {c:'🏺', k:'amphora'}, 
                {c:'🔮', k:'crystal'}, {c:'📿', k:'beads'}, {c:'🧿', k:'nazar'}, {c:'💈', k:'barber'}, {c:'⚗️', k:'alembic'}, {c:'🔭', k:'telescope'}, 
                {c:'🔬', k:'microscope'}, {c:'🕳️', k:'hole'}, {c:'💊', k:'pill'}, {c:'💉', k:'syringe'}, {c:'🩸', k:'blood'}, {c:'🩹', k:'bandage'}, 
                {c:'🩺', k:'stethoscope'}, {c:'🧬', k:'dna'}, {c:'🚪', k:'door'}, {c:'🛏️', k:'bed'}, {c:'🛋️', k:'couch'}, {c:'🪑', k:'chair'}, 
                {c:'🚽', k:'toilet'}, {c:'🚿', k:'shower'}, {c:'🛁', k:'bath'}, {c:'🪒', k:'razor'}, {c:'🧴', k:'lotion'}, {c:'🧷', k:'pin'}, 
                {c:'🧹', k:'broom'}, {c:'🧺', k:'basket'}, {c:'🧻', k:'paper'}, {c:'🧼', k:'soap'}, {c:'🧽', k:'sponge'}, {c:'🛒', k:'cart'}
            ]},
            { id: 'symbols', name: 'Symbols', icon: '❤️', emojis: [
                {c:'❤️', k:'heart'}, {c:'🧡', k:'orange heart'}, {c:'💛', k:'yellow heart'}, {c:'💚', k:'green heart'}, {c:'💙', k:'blue heart'}, 
                {c:'💜', k:'purple heart'}, {c:'🖤', k:'black heart'}, {c:'🤍', k:'white heart'}, {c:'🤎', k:'brown heart'}, {c:'💔', k:'broken heart'}, 
                {c:'❣️', k:'exclamation'}, {c:'💕', k:'two hearts'}, {c:'💞', k:'revolving'}, {c:'💓', k:'beating'}, {c:'💗', k:'growing'}, 
                {c:'💖', k:'sparkling'}, {c:'💘', k:'arrow'}, {c:'💝', k:'ribbon'}, {c:'💟', k:'decoration'}, {c:'☮️', k:'peace'}, 
                {c:'✝️', k:'cross'}, {c:'☪️', k:'star crescent'}, {c:'🕉️', k:'om'}, {c:'☸️', k:'dharma'}, {c:'✡️', k:'star david'}, 
                {c:'🔯', k:'six star'}, {c:'🕎', k:'menorah'}, {c:'☯️', k:'yin yang'}, {c:'☦️', k:'orthodox'}, {c:'🛐', k:'worship'}, 
                {c:'⛎', k:'ophiuchus'}, {c:'♈', k:'aries'}, {c:'♉', k:'taurus'}, {c:'♊', k:'gemini'}, {c:'♋', k:'cancer'}, 
                {c:'♌', k:'leo'}, {c:'♍', k:'virgo'}, {c:'♎', k:'libra'}, {c:'♏', k:'scorpio'}, {c:'♐', k:'sagittarius'}, 
                {c:'♑', k:'capricorn'}, {c:'♒', k:'aquarius'}, {c:'♓', k:'pisces'}, {c:'🆔', k:'id'}, {c:'⚛️', k:'atom'}, 
                {c:'🉑', k:'accept'}, {c:'☢️', k:'radioactive'}, {c:'☣️', k:'biohazard'}, {c:'📴', k:'mobile off'}, {c:'📳', k:'vibration'}, 
                {c:'🈶', k:'have'}, {c:'🈚', k:'no'}, {c:'🈸', k:'application'}, {c:'🈺', k:'open'}, {c:'🈷️', k:'month'}, 
                {c:'✴️', k:'eight star'}, {c:'🆚', k:'vs'}, {c:'💮', k:'white flower'}, {c:'🉐', k:'advantage'}, {c:'㊙️', k:'secret'}, 
                {c:'㊗️', k:'congrats'}, {c:'🈴', k:'match'}, {c:'🈵', k:'full'}, {c:'🈹', k:'discount'}, {c:'🈲', k:'prohibit'}, 
                {c:'🅰️', k:'a'}, {c:'🅱️', k:'b'}, {c:'🆎', k:'ab'}, {c:'🆑', k:'cl'}, {c:'🅾️', k:'o'}, 
                {c:'🆘', k:'sos'}, {c:'❌', k:'cross'}, {c:'⭕', k:'circle'}, {c:'🛑', k:'stop'}, {c:'⛔', k:'no entry'}, 
                {c:'📛', k:'name badge'}, {c:'🚫', k:'prohibited'}, {c:'💯', k:'hundred'}, {c:'💢', k:'anger'}, {c:'♨️', k:'hot springs'}, 
                {c:'🚷', k:'no pedestrians'}, {c:'🚯', k:'no litter'}, {c:'🚳', k:'no bikes'}, {c:'🚱', k:'no water'}, {c:'🔞', k:'under 18'}, 
                {c:'📵', k:'no phones'}, {c:'🚭', k:'no smoking'}, {c:'❗', k:'exclamation'}, {c:'❕', k:'white exclamation'}, {c:'❓', k:'question'}, 
                {c:'❔', k:'white question'}, {c:'‼️', k:'double exclamation'}, {c:'⁉️', k:'interrobang'}, {c:'🔅', k:'dim'}, {c:'🔆', k:'bright'}, 
                {c:'〽️', k:'part alternation'}, {c:'⚠️', k:'warning'}, {c:'🚸', k:'children'}, {c:'🔱', k:'trident'}, {c:'⚜️', k:'fleur de lis'}, 
                {c:'🔰', k:'beginner'}, {c:'♻️', k:'recycle'}, {c:'✅', k:'check'}, {c:'🈯', k:'reserved'}, {c:'💹', k:'chart'}, 
                {c:'❇️', k:'sparkle'}, {c:'✳️', k:'asterisk'}, {c:'❎', k:'cross box'}, {c:'🌐', k:'globe'}, {c:'💠', k:'diamond'}, 
                {c:'Ⓜ️', k:'m'}, {c:'🌀', k:'cyclone'}, {c:'💤', k:'zzz'}, {c:'🏧', k:'atm'}, {c:'🚾', k:'wc'}, 
                {c:'♿', k:'wheelchair'}, {c:'🅿️', k:'parking'}, {c:'🈳', k:'vacancy'}, {c:'🈂️', k:'service'}, {c:'🛂', k:'passport'}, 
                {c:'🛃', k:'customs'}, {c:'🛄', k:'baggage'}, {c:'🛅', k:'locker'}, {c:'🚹', k:'mens'}, {c:'🚺', k:'womens'}, 
                {c:'🚼', k:'baby'}, {c:'🚻', k:'restroom'}, {c:'🚮', k:'litter'}, {c:'🎦', k:'cinema'}, {c:'📶', k:'signal'}, 
                {c:'🈁', k:'koko'}, {c:'🔣', k:'symbols'}, {c:'ℹ️', k:'info'}, {c:'🔤', k:'abc'}, {c:'🔡', k:'abcd'}, 
                {c:'🔠', k:'capital'}, {c:'🆖', k:'ng'}, {c:'🆗', k:'ok'}, {c:'🆙', k:'up'}, {c:'🆒', k:'cool'}, 
                {c:'🆕', k:'new'}, {c:'🆓', k:'free'}, {c:'0️⃣', k:'zero'}, {c:'1️⃣', k:'one'}, {c:'2️⃣', k:'two'}, 
                {c:'3️⃣', k:'three'}, {c:'4️⃣', k:'four'}, {c:'5️⃣', k:'five'}, {c:'6️⃣', k:'six'}, {c:'7️⃣', k:'seven'}, 
                {c:'8️⃣', k:'eight'}, {c:'9️⃣', k:'nine'}, {c:'🔟', k:'ten'}, {c:'🔢', k:'numbers'}, {c:'#️⃣', k:'hash'}, 
                {c:'*️⃣', k:'star'}, {c:'⏏️', k:'eject'}, {c:'▶️', k:'play'}, {c:'⏸️', k:'pause'}, {c:'⏯️', k:'play pause'}, 
                {c:'⏹️', k:'stop'}, {c:'⏺️', k:'record'}, {c:'⏭️', k:'next'}, {c:'⏮️', k:'prev'}, {c:'⏩', k:'fast fwd'}, 
                {c:'⏪', k:'rewind'}, {c:'⏫', k:'fast up'}, {c:'⏬', k:'fast down'}, {c:'◀️', k:'reverse'}, {c:'🔼', k:'up'}, 
                {c:'🔽', k:'down'}, {c:'➡️', k:'right'}, {c:'⬅️', k:'left'}, {c:'⬆️', k:'up arrow'}, {c:'⬇️', k:'down arrow'}, 
                {c:'↗️', k:'up right'}, {c:'↘️', k:'down right'}, {c:'↙️', k:'down left'}, {c:'↖️', k:'up left'}, {c:'↕️', k:'up down'}, 
                {c:'↔️', k:'left right'}, {c:'🔄', k:'counterclockwise'}, {c:'↪️', k:'right curv'}, {c:'↩️', k:'left curv'}, {c:'⤴️', k:'curv up'}, 
                {c:'⤵️', k:'curv down'}, {c:'🔀', k:'shuffle'}, {c:'🔁', k:'repeat'}, {c:'🔂', k:'repeat one'}
            ]},
            { id: 'flags', name: 'Flags', icon: '🏳️', emojis: [
                {c:'🏳️', k:'white flag'}, {c:'🏳️‍🌈', k:'rainbow'}, {c:'🏳️‍⚧️', k:'transgender'}, {c:'🏴', k:'black flag'}, 
                {c:'🏁', k:'checkered'}, {c:'🚩', k:'triangular'}, {c:'🎌', k:'crossed'}, {c:'🏴‍☠️', k:'pirate'}, 
                {c:'🇺🇳', k:'un'}, {c:'🇦🇫', k:'afghanistan'}, {c:'🇦🇱', k:'albania'}, {c:'🇩🇿', k:'algeria'}, 
                {c:'🇦🇸', k:'american samoa'}, {c:'🇦🇩', k:'andorra'}, {c:'🇦🇴', k:'angola'}, {c:'🇦🇮', k:'anguilla'}, 
                {c:'🇦🇶', k:'antarctica'}, {c:'🇦🇬', k:'antigua'}, {c:'🇦🇷', k:'argentina'}, {c:'🇦🇲', k:'armenia'}, 
                {c:'🇦🇼', k:'aruba'}, {c:'🇦🇺', k:'australia'}, {c:'🇦🇹', k:'austria'}, {c:'🇦🇿', k:'azerbaijan'}, 
                {c:'🇧🇸', k:'bahamas'}, {c:'🇧🇭', k:'bahrain'}, {c:'🇧🇩', k:'bangladesh'}, {c:'🇧🇧', k:'barbados'}, 
                {c:'🇧🇾', k:'belarus'}, {c:'🇧🇪', k:'belgium'}, {c:'🇧🇿', k:'belize'}, {c:'🇧🇯', k:'benin'}, 
                {c:'🇧🇲', k:'bermuda'}, {c:'🇧🇹', k:'bhutan'}, {c:'🇧🇴', k:'bolivia'}, {c:'🇧🇦', k:'bosnia'}, 
                {c:'🇧🇼', k:'botswana'}, {c:'🇧🇷', k:'brazil'}, {c:'🇮🇴', k:'british indian ocean'}, {c:'🇻🇬', k:'british virgin islands'}, 
                {c:'🇧🇳', k:'brunei'}, {c:'🇧🇬', k:'bulgaria'}, {c:'🇧🇫', k:'burkina faso'}, {c:'🇧🇮', k:'burundi'}, 
                {c:'🇰🇭', k:'cambodia'}, {c:'🇨🇲', k:'cameroon'}, {c:'🇨🇦', k:'canada'}, {c:'🇮🇨', k:'canary islands'}, 
                {c:'🇨🇻', k:'cape verde'}, {c:'🇧e', k:'caribbean netherlands'}, {c:'🇰🇾', k:'cayman islands'}, {c:'🇨🇫', k:'central african republic'}, 
                {c:'🇹🇩', k:'chad'}, {c:'🇨🇱', k:'chile'}, {c:'🇨🇳', k:'china'}, {c:'🇨🇽', k:'christmas island'}, 
                {c:'🇨🇨', k:'cocos islands'}, {c:'🇨🇴', k:'colombia'}, {c:'🇰🇲', k:'comoros'}, {c:'🇨🇬', k:'congo brazzaville'}, 
                {c:'🇨🇩', k:'congo kinshasa'}, {c:'🇨🇰', k:'cook islands'}, {c:'🇨🇷', k:'costa rica'}, {c:'🇨🇮', k:'cote divoire'}, 
                {c:'🇭🇷', k:'croatia'}, {c:'🇨🇺', k:'cuba'}, {c:'🇨🇼', k:'curacao'}, {c:'🇨🇾', k:'cyprus'}, 
                {c:'🇨🇿', k:'czechia'}, {c:'🇩🇰', k:'denmark'}, {c:'🇩🇯', k:'djibouti'}, {c:'🇩🇲', k:'dominica'}, 
                {c:'🇩🇴', k:'dominican republic'}, {c:'🇪🇨', k:'ecuador'}, {c:'🇪🇬', k:'egypt'}, {c:'🇸🇻', k:'el salvador'}, 
                {c:'🇬🇶', k:'equatorial guinea'}, {c:'🇪🇷', k:'eritrea'}, {c:'🇪🇪', k:'estonia'}, {c:'🇪🇹', k:'ethiopia'}, 
                {c:'🇪🇺', k:'european union'}, {c:'🇫🇰', k:'falkland islands'}, {c:'🇫🇴', k:'faroe islands'}, {c:'🇫🇯', k:'fiji'}, 
                {c:'🇫🇮', k:'finland'}, {c:'🇫🇷', k:'france'}, {c:'🇬🇫', k:'french guiana'}, {c:'🇵🇫', k:'french polynesia'}, 
                {c:'🇹🇫', k:'french southern territories'}, {c:'🇬🇦', k:'gabon'}, {c:'🇬🇲', k:'gambia'}, {c:'🇬🇪', k:'georgia'}, 
                {c:'🇩🇪', k:'germany'}, {c:'🇬🇭', k:'ghana'}, {c:'🇬🇮', k:'gibraltar'}, {c:'🇬🇷', k:'greece'}, 
                {c:'🇬🇱', k:'greenland'}, {c:'🇬🇩', k:'grenada'}, {c:'🇬🇵', k:'guadeloupe'}, {c:'🇬🇺', k:'guam'}, 
                {c:'🇬🇹', k:'guatemala'}, {c:'🇬🇬', k:'guernsey'}, {c:'🇬🇳', k:'guinea'}, {c:'🇬🇼', k:'guinea bissau'}, 
                {c:'🇬🇾', k:'guyana'}, {c:'🇭🇹', k:'haiti'}, {c:'🇭🇳', k:'honduras'}, {c:'🇭🇰', k:'hong kong'}, 
                {c:'🇭🇺', k:'hungary'}, {c:'🇮🇸', k:'iceland'}, {c:'🇮🇳', k:'india'}, {c:'🇮🇩', k:'indonesia'}, 
                {c:'🇮🇷', k:'iran'}, {c:'🇮🇶', k:'iraq'}, {c:'🇮🇪', k:'ireland'}, {c:'🇮🇲', k:'isle of man'}, 
                {c:'🇮🇱', k:'israel'}, {c:'🇮🇹', k:'italy'}, {c:'🇯🇲', k:'jamaica'}, {c:'🇯🇵', k:'japan'}, 
                {c:'🇯🇪', k:'jersey'}, {c:'🇯🇴', k:'jordan'}, {c:'🇰🇿', k:'kazakhstan'}, {c:'🇰🇪', k:'kenya'}, 
                {c:'🇰🇮', k:'kiribati'}, {c:'🇽🇰', k:'kosovo'}, {c:'🇰🇼', k:'kuwait'}, {c:'🇰🇬', k:'kyrgyzstan'}, 
                {c:'🇱🇦', k:'laos'}, {c:'🇱🇻', k:'latvia'}, {c:'🇱🇧', k:'lebanon'}, {c:'🇱🇸', k:'lesotho'}, 
                {c:'🇱🇷', k:'liberia'}, {c:'🇱🇾', k:'libya'}, {c:'🇱🇮', k:'liechtenstein'}, {c:'🇱🇹', k:'lithuania'}, 
                {c:'🇱🇺', k:'luxembourg'}, {c:'🇲🇴', k:'macao'}, {c:'🇲🇬', k:'madagascar'}, {c:'🇲🇼', k:'malawi'}, 
                {c:'🇲🇾', k:'malaysia'}, {c:'🇲🇻', k:'maldives'}, {c:'🇲🇱', k:'mali'}, {c:'🇲🇹', k:'malta'}, 
                {c:'🇲🇭', k:'marshall islands'}, {c:'🇲🇶', k:'martinique'}, {c:'🇲🇷', k:'mauritania'}, {c:'🇲🇺', k:'mauritius'}, 
                {c:'🇾', k:'mayotte'}, {c:'🇲🇽', k:'mexico'}, {c:'🇫🇲', k:'micronesia'}, {c:'🇲🇩', k:'moldova'}, 
                {c:'🇲🇨', k:'monaco'}, {c:'🇲🇳', k:'mongolia'}, {c:'🇲🇪', k:'montenegro'}, {c:'🇲🇸', k:'montserrat'}, 
                {c:'🇲🇦', k:'morocco'}, {c:'🇲🇿', k:'mozambique'}, {c:'🇲🇲', k:'myanmar'}, {c:'🇳🇦', k:'namibia'}, 
                {c:'🇳🇷', k:'nauru'}, {c:'🇳🇵', k:'nepal'}, {c:'🇳🇱', k:'netherlands'}, {c:'🇳🇨', k:'new caledonia'}, 
                {c:'🇳🇿', k:'new zealand'}, {c:'🇳🇮', k:'nicaragua'}, {c:'🇳🇪', k:'niger'}, {c:'🇳🇬', k:'nigeria'}, 
                {c:'🇳🇺', k:'niue'}, {c:'🇳🇫', k:'norfolk island'}, {c:'🇰🇵', k:'north korea'}, {c:'🇲🇰', k:'north macedonia'}, 
                {c:'🇲🇵', k:'northern mariana islands'}, {c:'🇳🇴', k:'norway'}, {c:'🇴🇲', k:'oman'}, {c:'🇵🇰', k:'pakistan'}, 
                {c:'🇵🇼', k:'palau'}, {c:'🇵🇸', k:'palestinian territories'}, {c:'🇵🇦', k:'panama'}, {c:'🇵🇬', k:'papua new guinea'}, 
                {c:'🇵🇾', k:'paraguay'}, {c:'🇵🇪', k:'peru'}, {c:'🇵🇭', k:'philippines'}, {c:'🇵🇳', k:'pitcairn islands'}, 
                {c:'🇵🇱', k:'poland'}, {c:'🇵🇹', k:'portugal'}, {c:'🇵🇷', k:'puerto rico'}, {c:'🇶🇦', k:'qatar'}, 
                {c:'🇷🇪', k:'reunion'}, {c:'🇷🇴', k:'romania'}, {c:'🇷🇺', k:'russia'}, {c:'🇷🇼', k:'rwanda'}, 
                {c:'🇼🇸', k:'samoa'}, {c:'🇸🇲', k:'san marino'}, {c:'🇸🇹', k:'sao tome'}, {c:'🇸🇦', k:'saudi arabia'}, 
                {c:'🇸🇳', k:'senegal'}, {c:'🇷🇸', k:'serbia'}, {c:'🇸🇨', k:'seychelles'}, {c:'🇸🇱', k:'sierra leone'}, 
                {c:'🇸🇬', k:'singapore'}, {c:'🇸🇽', k:'sint maarten'}, {c:'🇸🇰', k:'slovakia'}, {c:'🇸🇮', k:'slovenia'}, 
                {c:'🇸🇧', k:'solomon islands'}, {c:'🇸🇴', k:'somalia'}, {c:'🇿🇦', k:'south africa'}, {c:'🇬🇸', k:'south georgia'}, 
                {c:'🇰🇷', k:'south korea'}, {c:'🇸🇸', k:'south sudan'}, {c:'🇪🇸', k:'spain'}, {c:'🇱🇰', k:'sri lanka'}, 
                {c:'🇧🇱', k:'st barthelemy'}, {c:'🇸🇭', k:'st helena'}, {c:'🇰🇳', k:'st kitts'}, {c:'🇱🇨', k:'st lucia'}, 
                {c:'🇲🇫', k:'st martin'}, {c:'🇵🇲', k:'st pierre'}, {c:'🇻', k:'st vincent'}, {c:'🇸🇩', k:'sudan'}, 
                {c:'🇸🇷', k:'suriname'}, {c:'🇸🇯', k:'svalbard'}, {c:'🇸🇪', k:'sweden'}, {c:'🇨🇭', k:'switzerland'}, 
                {c:'🇸🇾', k:'syria'}, {c:'🇹🇼', k:'taiwan'}, {c:'🇹🇯', k:'tajikistan'}, {c:'🇹🇿', k:'tanzania'}, 
                {c:'🇹🇭', k:'thailand'}, {c:'🇹🇱', k:'timor leste'}, {c:'🇹🇬', k:'togo'}, {c:'🇹🇰', k:'tokelau'}, 
                {c:'🇹🇴', k:'tonga'}, {c:'🇹🇹', k:'trinidad'}, {c:'🇹🇳', k:'tunisia'}, {c:'🇹🇷', k:'turkey'}, 
                {c:'🇹🇲', k:'turkmenistan'}, {c:'🇹🇨', k:'turks caicos'}, {c:'🇹🇻', k:'tuvalu'}, {c:'🇺🇬', k:'uganda'}, 
                {c:'🇺🇦', k:'ukraine'}, {c:'🇦🇪', k:'united arab emirates'}, {c:'🇬🇧', k:'united kingdom'}, {c:'🇺🇸', k:'united states'}, 
                {c:'🇺🇾', k:'uruguay'}, {c:'🇻🇮', k:'us virgin islands'}, {c:'🇺🇿', k:'uzbekistan'}, {c:'🇻🇺', k:'vanuatu'}, 
                {c:'🇻🇦', k:'vatican city'}, {c:'🇻🇪', k:'venezuela'}, {c:'🇻🇳', k:'vietnam'}, {c:'🇼🇫', k:'wallis futuna'}, 
                {c:'🇪🇭', k:'western sahara'}, {c:'🇾🇪', k:'yemen'}, {c:'🇿🇲', k:'zambia'}, {c:'🇿🇼', k:'zimbabwe'}
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
                    flex-shrink: 0; 
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
                    flex-shrink: 0;
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
                    min-height: 0; /* Critical for flex scrolling */
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
        this.updateRecentsDOM();
    }

    updateRecentsDOM() {
        // Find existing recents container
        let recentsContainer = this.shadowRoot.getElementById('cat-recents');
        
        // If it doesn't exist (because user had 0 recents), we might need to reload full
        if(!recentsContainer) {
             // Simple fallback: re-render all if we just started having recents
             if(this.recentEmojis.length === 1) this.loadEmojis('all');
             return;
        }

        // Just update the grid inside recents
        const grid = recentsContainer.querySelector('.ep-grid');
        if(grid) {
            grid.innerHTML = '';
            this.recentEmojis.forEach(char => {
                 const el = document.createElement('div');
                 el.className = 'ep-emoji';
                 // Determine skin tone capability (basic check if char matches known list)
                 // For true accuracy we'd need to lookup in fullEmojiList, but for speed we apply current tone if user wants
                 // Or store skin tone support in recents. For now, render raw char.
                 el.innerText = char; 
                 el.onclick = () => {
                    this.addToRecents(char);
                    this.dispatchEvent(new CustomEvent('emoji-click', { detail: { emoji: char, unicode: char }, bubbles: true, composed: true }));
                 };
                 grid.appendChild(el);
            });
        }
    }
}

customElements.define('emoji-picker', EmojiPicker);
