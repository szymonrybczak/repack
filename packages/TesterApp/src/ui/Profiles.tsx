'use server';

import { View, Text } from 'react-native';
import React from 'react';
import downloadProfile from './../db/downloadProfile';

export default function Profiles() {
  // const profiles = await downloadProfile();

  return (
    <View>
      <Text>kurwa jego mac</Text>
    </View>
  );
}

// nawet jak jest "use chuj" to nie whcodzi do tego klienckiego bundla.
// sprawdzic roznice w konfigach gdzie my wpierddalamy kazdy plik pewnie w tym repack plugin i dlatego nie dziala
