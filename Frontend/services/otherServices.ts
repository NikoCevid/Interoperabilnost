import api from "./api";
import type {
  SoapSearchResponse,
  WeatherResult,
  GraphQLResponse,
  PagedResult,
  Tag,
} from "../types";

export const soapService = {
  search: async (searchTerm: string): Promise<SoapSearchResponse> => {
    const { data } = await api.post<SoapSearchResponse>("/soap/search", {
      searchTerm,
    });
    return data;
  },
};

export const weatherService = {
  getByCity: async (cityName: string): Promise<WeatherResult> => {
    const { data } = await api.get<WeatherResult>(
      `/weather/${encodeURIComponent(cityName)}`,
    );
    return data;
  },
};

const GRAPHQL_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/graphql`;

export const graphqlService = {
  query: async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    const json: GraphQLResponse<T> = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data!;
  },

  getTags: async (search?: string, page = 1, pageSize = 10) => {
    const data = await graphqlService.query<{ tags: PagedResult<Tag> }>(
      `
      query GetTags($search: String, $page: Int, $pageSize: Int) {
        tags(search: $search, page: $page, pageSize: $pageSize) {
          items { id name color description dateCreated }
          totalCount page pageSize totalPages
        }
      }
    `,
      { search, page, pageSize },
    );
    return data.tags;
  },

  searchTags: async (searchTerm: string) => {
    const data = await graphqlService.query<{ searchTags: Tag[] }>(
      `
      query SearchTags($searchTerm: String!) {
        searchTags(searchTerm: $searchTerm) {
          id name color description dateCreated
        }
      }
    `,
      { searchTerm },
    );
    return data.searchTags;
  },

  createTag: async (name: string, color: string, description?: string) => {
    const data = await graphqlService.query<{ createTag: Tag }>(
      `
      mutation CreateTag($name: String!, $color: String!, $description: String) {
        createTag(name: $name, color: $color, description: $description) {
          id name color description dateCreated
        }
      }
    `,
      { name, color, description },
    );
    return data.createTag;
  },

  updateTag: async (
    id: string,
    name: string,
    color: string,
    description?: string,
  ) => {
    const data = await graphqlService.query<{ updateTag: Tag }>(
      `
      mutation UpdateTag($id: UUID!, $name: String!, $color: String!, $description: String) {
        updateTag(id: $id, name: $name, color: $color, description: $description) {
          id name color description dateCreated
        }
      }
    `,
      { id, name, color, description },
    );
    return data.updateTag;
  },

  deleteTag: async (id: string) => {
    const data = await graphqlService.query<{ deleteTag: boolean }>(
      `
      mutation DeleteTag($id: UUID!) {
        deleteTag(id: $id)
      }
    `,
      { id },
    );
    return data.deleteTag;
  },
};
