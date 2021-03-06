/*
 *
 *  Copyright 2011 Netflix, Inc.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

package com.netflix.exhibitor.core.backup;

public class BackupMetaData
{
    private final String    name;
    private final long      modifiedDate;

    public BackupMetaData(String name, long modifiedDate)
    {
        this.name = name;
        this.modifiedDate = modifiedDate;
    }

    public String getName()
    {
        return name;
    }

    public long getModifiedDate()
    {
        return modifiedDate;
    }

    @SuppressWarnings("RedundantIfStatement")
    @Override
    public boolean equals(Object o)
    {
        if ( this == o )
        {
            return true;
        }
        if ( o == null || getClass() != o.getClass() )
        {
            return false;
        }

        BackupMetaData that = (BackupMetaData)o;

        if ( modifiedDate != that.modifiedDate )
        {
            return false;
        }
        if ( !name.equals(that.name) )
        {
            return false;
        }

        return true;
    }

    @Override
    public int hashCode()
    {
        int result = name.hashCode();
        result = 31 * result + (int)(modifiedDate ^ (modifiedDate >>> 32));
        return result;
    }

    @Override
    public String toString()
    {
        return "BackupMetaData{" +
            "name='" + name + '\'' +
            ", version=" + modifiedDate +
            '}';
    }
}
