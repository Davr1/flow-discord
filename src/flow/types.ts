import { Methods } from "./constants";

export interface Query {
    rawQuery: string;
    isReQuery: boolean;
    search: string;
    searchTerms: string[];
    actionKeyword: string;
}

export interface PluginMetadata {
    id: string;
    name: string;
    author: string;
    version: string;
    language: string;
    description: string;
    website: string;
    disabled: boolean;
    executeFilePath: string;
    executeFileName: string;
    pluginDirectory: string;
    actionKeyword: string;
    actionKeywords: string[];
    icoPath: string;
}

export interface Init {
    currentPluginMetadata: PluginMetadata;
    api: Record<string, string>;
}

export interface QueryResult {
    title: string;
    subtitle?: string;
    icoPath?: string;
    score?: number;
}

export type Command = {
    [Methods.ChangeQuery]: {
        query: string;
        requery?: boolean;
    };
    [Methods.ShellRun]: {
        cmd: string;
        filename?: string;
    };
    [Methods.CopyToClipboard]: {
        text: string;
        directCopy?: boolean;
        showDefaultNotification?: boolean;
    };
    [Methods.ShowMsgError]: {
        title: string;
        subTitle?: string;
    };
    [Methods.ShowMsg]: {
        title: string;
        subTitle?: string;
        iconPath?: string;
    };
    [Methods.GetTranslation]: {
        key: string;
    };
    [Methods.FuzzySearch]: {
        query: string;
        stringToCompare: string;
    };
    [Methods.OpenDirectory]: {
        DirectoryPath: string;
        FileNameOrFilePath?: string | null;
    };
    [Methods.OpenUrl]: {
        url: string;
        inPrivate?: boolean | null;
    };
    [Methods.OpenAppUri]: {
        appUri: string;
    };
    [Methods.SetGameMode]: {
        value: boolean;
    };
    [Methods.ReQuery]: {
        reselect?: boolean;
    };
};

export type CommandResponse = {
    [Methods.GetAllPlugins]: {
        plugin: {};
        metadata: PluginMetadata;
    }[];
    [Methods.GetTranslation]: string;
    [Methods.FuzzySearch]: {
        success: boolean;
        score: number;
        rawScore: number;
        matchData: number[];
        searchPrecision: 0 | 20 | 50;
    };
};
