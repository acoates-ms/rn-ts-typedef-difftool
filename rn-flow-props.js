/*
 * @flow
 * @format
 */

'use strict';

const fs = require('fs');
const { spawnSync } = require('child_process');

const RN_IMPL =
  '../react-native/Libraries/react-native/react-native-implementation.js';

const impl = fs.readFileSync(RN_IMPL, 'utf8').split('\n');

const SEARCH_COLUMN = 16;
// console.log(getWordAtLine(12));

function getWordAtLine(lineNum) {
  const line = impl[lineNum];
  const firstSpace = line.slice(0, SEARCH_COLUMN + 1).lastIndexOf(' ');
  const nextSpace = line.indexOf(' ', firstSpace + 1);
  // console.log(firstSpace, firstSpace + 1 + nextSpace);
  return line.slice(firstSpace + 1, nextSpace);
}

const COMPONENTS = [
  'AccessibilityInfo',
  'ActivityIndicator',
  'ART',
  'Button',
  'CheckBox',
  'DatePickerIOS',
  'DrawerLayoutAndroid',
  'FlatList',
  'Image',
  'ImageBackground',
  'InputAccessoryView',
  'KeyboardAvoidingView',
  'MaskedViewIOS',
  'Modal',
  'Picker',
  'PickerIOS',
  'ProgressBarAndroid',
  'ProgressViewIOS',
  'SafeAreaView',
  'ScrollView',
  'SectionList',
  'SegmentedControlIOS',
  'Slider',
  'Switch',
  'RefreshControl',
  'StatusBar',
  'Text',
  'TextInput',
  'Touchable',
  'TouchableHighlight',
  'TouchableNativeFeedback',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
  'View',
  'VirtualizedList',
  'VirtualizedSectionList'
];

const componentPropMap = new Map();

// process.exit(0);
for (let i = 16; i <= 16; i++) {
  let fileName = getWordAtLine(i - 1);
  if (!COMPONENTS.includes(fileName)) {
    continue;
  }

  const type = JSON.parse(getTypeAtPos(String(i)).stdout);
  // console.log(type.expanded_type);
  if (
    type.expanded_type == null ||
    type.expanded_type.kind === 'Implicit Any' || // untyped, like ReactNativeART
    type.expanded_type.body == null // Class, like Button
  ) {
    continue;
  }
  // console.log(type.expanded_type.body);

  let props = getProps(type.expanded_type.body);
  // console.log('a');
  if (props == null) {
    continue;
  }
  // console.log('b');
  // switch (type.expanded_type.kind) {
  //   case 'ClassDecl':
  //     break;
  //   default:
  //     console.log(
  //       '===not handled',
  //       type.expanded_type.kind,
  //       type.expanded_type,
  //     );
  //     process.exit(1);
  // }

  // const fileName = type.expanded_type.name.provenance.loc;
  // const props = getProps(type.expanded_type.body);
  const propsSet = new Set();
  printProps(props, propsSet);

  componentPropMap.set(fileName, propsSet);
}

const viewProps = componentPropMap.get('View');

componentPropMap.forEach((value, key) => {
  console.log('--', key, '--');
  Array.from(value)
    .sort()
    .forEach(prop => {
      if (key === 'View' || !viewProps.has(prop)) {
        console.log(prop);
      }
    });
  console.log('\n\n');
});

function getProps(type) {
  // console.log('c');
  switch (type.kind) {
    case 'Class':
    case 'class':
    case '$ReadOnly':
    case 'type alias':
      if (type.typeArgs == null) {
        // console.log('null type', type);
        return null;
      }
      // if (type.typeArgs[0] == null) {
      //   console.log('typeArgs', type.typeArgs);
      // }
      return getProps(type.typeArgs[0]);
    case 'Obj':
      if (type.props == null) {
        // console.log('Obj', type);
      }
      return type.props;
    case 'Implicit Any':
      return null;
    default:
      console.log('---not handled', type.kind, type);
      return;
  }
}

function printProps(props, propsSet) {
  props.forEach(prop => {
    // console.log('d');
    switch (prop.kind) {
      case 'SpreadProp':
        printProps(prop.prop.typeArgs, propsSet);
        break;
      case 'Obj':
        printProps(prop.props, propsSet);
        break;
      case 'NamedProp':
        propsSet.add(prop.prop.name);
        break;
      default:
        console.log('---unhandled kind', prop.kind);
    }
  });
}

function getTypeAtPos(line) {
  return spawnSync(
    'flow',
    [
      'type-at-pos',
      RN_IMPL,
      line,
      String(SEARCH_COLUMN),
      '--expand-type-aliases',
      '--expand-json-output'
    ],
    {
      encoding: 'utf8'
    }
  );
}

/*
flow type-at-pos ~/fbsource/xplat/js/react-native-github/Libraries/react-native/react-native-implementation.js 39 16 --expand-type-aliases --expand-json-output --help
*/
