const BASE_URL = 'http://localhost:3000';

// export function post(url: string, config?: RequestInit) {
//   return requestByFetch(url, { ...config, method: 'POST' });
// }

// export async function requestByFetch(url: string, config?: RequestInit) {
//   try {
//     const res = await fetch(new Request(url, config));
//     const json = await res.json();

//     console.log('[ request ]: ', url, json, res);

//     const statusText = res.statusText;

//     if (statusText === 'OK') {
//       return json;
//     } else {
//       throw new Error(statusText);
//     }
//   } catch (err) {
//     console.error('[ Request Failed ]: ', err);
//   }
// }

export interface CusAbortController {
  abort: () => void;
}

export interface RequestConfig {
  url: string;
  data: any;
  method?: 'get' | 'post' | 'put' | 'delete'; // Add other HTTP methods as needed
  headers?: Record<string, string>;
  onProgress?: (event: any) => any; // Replace 'any' with the actual event type if known
  abortController?: CusAbortController;
}

export function request({
  url,
  data,
  method = 'post',
  headers = {},
  onProgress = (e: any) => e,
  abortController,
}: RequestConfig) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = onProgress;

    xhr.open(method, url);

    Object.keys(headers).forEach((key) =>
      xhr.setRequestHeader(key, headers[key])
    );

    xhr.send(data);

    if (abortController) {
      abortController.abort = () => xhr.abort();
    }

    xhr.onreadystatechange = (e: any) => {
      if (xhr.readyState === 4) {
        const response = e.target?.response;

        if (xhr.status === 200) {
          resolve(response);
        } else if (xhr.status === 500) {
          reject(response);
        }
      }
    };

    xhr.onerror = (e) => reject(e);
  });
}

export async function post(url: string, data, config?: Partial<RequestConfig>) {
  const ret: any = await request({
    data,
    url: BASE_URL + url,
    ...config,
  });
  const parseRet = parseJSON(ret);
  console.log('[ post ]: ', url, parseRet);
  return parseRet;
}

function parseJSON(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}
