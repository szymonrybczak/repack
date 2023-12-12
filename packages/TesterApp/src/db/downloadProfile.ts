// import 'server-only';

// const sleep = (ms: number) => {
//   console.log(`sleeping for ${ms}ms`, new Date().toISOString());
//   return new Promise<void>((resolve) => setTimeout(resolve, ms));
// };

// const downloadProfiles = async () => {
//   const profileIds = ['1', '2', '3'];
//   const profileData = await Promise.all(
//     profileIds.map(async (id) => {
//       await sleep(1000);
//       return { id, name: `profile ${id}` };
//     })
//   );
//   console.log('downloaded profiles', profileData);
//   return profileData;
// };

// export default downloadProfiles;
