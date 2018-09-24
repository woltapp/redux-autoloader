const reducerMountPoint = 'reduxAutoloader';

export const getLoaderState = state => state[reducerMountPoint];

export const isInitialized = (state, loaderName) =>
  !!getLoaderState(state)[loaderName];

export const isLoading = (state, loaderName) =>
  getLoaderState(state)[loaderName].loading;

export const isRefreshing = (state, loaderName) =>
  getLoaderState(state)[loaderName].refreshing;

export const getData = (state, loaderName) =>
  getLoaderState(state)[loaderName].data;

export const getDataReceivedAt = (state, loaderName) =>
  getLoaderState(state)[loaderName].dataReceivedAt;

export const getError = (state, loaderName) =>
  getLoaderState(state)[loaderName].error;

export const getErrorReceivedAt = (state, loaderName) =>
  getLoaderState(state)[loaderName].errorReceivedAt;

export const getUpdatedAt = (state, loaderName) =>
  getLoaderState(state)[loaderName].updatedAt;

export const createMemoizedGetData = () => {
  let memData;
  let memDataReceivedAt;

  return (state, loaderName) => {
    const data = getData(state, loaderName);
    const dataReceivedAt = getDataReceivedAt(state, loaderName);

    if (memDataReceivedAt === dataReceivedAt) {
      return memData;
    }

    memData = data;
    memDataReceivedAt = dataReceivedAt;

    return data;
  };
};
