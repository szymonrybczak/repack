'use client';
import React, { use, Suspense } from 'react';
import { Appearance, Text } from 'react-native';

// import { createFromReadableStream } from '@callstack/repack/client';
import { AppContainer } from './ui/AppContainer';
import { Section } from './ui/Section';
import { SectionContainer } from './ui/SectionContainer';
import Profiles from './ui/Profiles';

import { AsyncContainer } from './asyncChunks/AsyncContainer';
import { RemoteContainer } from './remoteChunks/RemoteContainer';
import { MiniAppsContainer } from './miniapp/MiniAppsContainer';
import { AssetsTestContainer } from './assetsTest/AssetsTestContainer';

Appearance.setColorScheme('light');

const AsyncText = () => {
  // write a promise that resolves after 1s
  const promise = new Promise((resolve) => {
    setTimeout(() => {
      resolve('Hello world!');
    }, 1000);
  });
  return <Text>{use(promise)}</Text>;
};

const App = () => {
  return (
    <AppContainer>
      <Text>Siemanko dowieziemy to demo!</Text>
      <Suspense fallback={<Text>Loading..</Text>}>
        <AsyncText />
      </Suspense>
      <Profiles />
      <SectionContainer>
        <Section title="Async chunk">
          <AsyncContainer />
        </Section>
        <Section title="Remote chunks">
          <RemoteContainer />
        </Section>
        <Section title="Mini-apps">
          <MiniAppsContainer />
        </Section>
        <Section title="Assets test">
          <AssetsTestContainer />
        </Section>
      </SectionContainer>
    </AppContainer>
  );
};

export default App;
